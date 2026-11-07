#!/usr/bin/env node
/**
 * Finds accounts made by sign-up scripts (ADR-0018) and deletes them after review.
 *
 *   node scripts/junk-accounts.js list --since 2026-10-01 [--out junk-accounts.csv]
 *   node scripts/junk-accounts.js delete junk-accounts.csv
 *
 * `list` changes nothing. It writes a CSV of candidates: accounts created on or after --since that
 * sign in with a password only, never verified their email, were not signed in to after the day they
 * were created, and have no activities and no saved preferences. Real riders who signed up and left
 * the same day match too; the `sameInbox` column (Gmail addresses that differ only by dots or a
 * +tag) helps tell the scripts apart. Remove any rows you want to keep before deleting.
 *
 * `delete` deletes only the uids in the reviewed file, checking each one against the same rules
 * first, so an account that has since uploaded a ride or verified its email is kept.
 *
 * Credentials: Application Default Credentials (`gcloud auth application-default login`) with
 * GOOGLE_CLOUD_PROJECT=mycda-c43c6, or the emulators when FIREBASE_AUTH_EMULATOR_HOST and
 * FIRESTORE_EMULATOR_HOST are set.
 */
const fs = require("node:fs");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const DAY_MS = 24 * 60 * 60 * 1000;
const COLUMNS = ["uid", "email", "created", "lastSignIn", "sameInbox"];

initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT });
const auth = getAuth();
const db = getFirestore();

/** Gmail ignores dots and +tags, so these all reach one inbox. */
function inbox (email) {
  const [local, domain] = email.toLowerCase().split("@");
  if (domain !== "gmail.com" && domain !== "googlemail.com") return `${local.split("+")[0]}@${domain}`;
  return `${local.split("+")[0].replaceAll(".", "")}@gmail.com`;
}

/** The rules that need only the Auth record. */
function looksScripted (user, since) {
  const created = Date.parse(user.metadata.creationTime);
  const lastSignIn = Date.parse(user.metadata.lastSignInTime ?? "") || created;
  const providers = user.providerData.map((p) => p.providerId);
  return !!user.email &&
    created >= since &&
    !user.emailVerified &&
    providers.length > 0 && providers.every((p) => p === "password") &&
    lastSignIn - created < DAY_MS;
}

/** True when the account has no rides and no saved preferences. */
async function hasNoData (uid) {
  const [activities, prefs] = await Promise.all([
    db.collection("activities").where("uid", "==", uid).limit(1).get(),
    db.doc(`userprefs/${uid}`).get()
  ]);
  return activities.empty && !prefs.exists;
}

/** Runs `fn` over `items`, `size` at a time. */
async function inBatches (items, size, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(...await Promise.all(items.slice(i, i + size).map(fn)));
  }
  return results;
}

const csvField = (value) => `"${String(value).replaceAll("\"", "\"\"")}"`;

async function list (since, out) {
  const users = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);

  const perInbox = new Map();
  for (const user of users) {
    if (user.email) perInbox.set(inbox(user.email), (perInbox.get(inbox(user.email)) ?? 0) + 1);
  }

  const suspects = users.filter((user) => looksScripted(user, since));
  const empty = await inBatches(suspects, 20, (user) => hasNoData(user.uid));
  const candidates = suspects.filter((_, i) => empty[i])
    .sort((a, b) => Date.parse(a.metadata.creationTime) - Date.parse(b.metadata.creationTime));

  const rows = candidates.map((user) => [
    user.uid,
    user.email,
    new Date(user.metadata.creationTime).toISOString(),
    user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toISOString() : "",
    perInbox.get(inbox(user.email))
  ]);
  fs.writeFileSync(out, [COLUMNS, ...rows].map((row) => row.map(csvField).join(",")).join("\n") + "\n");
  console.log(`${users.length} accounts; ${suspects.length} match the Auth rules, ${candidates.length} of them have no data.`);
  console.log(`Wrote ${out}. Review it, remove any rows to keep, then run: node scripts/junk-accounts.js delete ${out}`);
}

function readUids (file) {
  const [header, ...lines] = fs.readFileSync(file, "utf8").trim().split("\n");
  const uidColumn = header.split(",").map((h) => h.replaceAll("\"", "")).indexOf("uid");
  if (uidColumn < 0) throw new Error(`${file} has no uid column`);
  return lines.filter(Boolean).map((line) => line.split(",")[uidColumn].replaceAll("\"", ""));
}

async function remove (file, since) {
  const uids = readUids(file);
  const checked = await inBatches(uids, 20, async (uid) => {
    const user = await auth.getUser(uid).catch(() => undefined);
    if (!user) return { uid, keep: "already gone" };
    if (!looksScripted(user, since)) return { uid, keep: "signed in again, verified, or not a password account" };
    if (!await hasNoData(uid)) return { uid, keep: "has activities or preferences" };
    return { uid };
  });

  for (const { uid, keep } of checked.filter((c) => c.keep)) console.log(`keeping ${uid}: ${keep}`);
  const doomed = checked.filter((c) => !c.keep).map((c) => c.uid);
  let deleted = 0;
  for (let i = 0; i < doomed.length; i += 1000) {
    const result = await auth.deleteUsers(doomed.slice(i, i + 1000));
    deleted += result.successCount;
    for (const { index, error } of result.errors) console.error(`failed ${doomed[i + index]}: ${error.message}`);
  }
  console.log(`Deleted ${deleted} of ${uids.length} accounts in ${file}.`);
}

function option (args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main () {
  const [command, ...args] = process.argv.slice(2);
  // delete re-checks against the same rules; the creation date alone isn't in the file's control
  const since = Date.parse(option(args, "--since") ?? (command === "delete" ? "1970-01-01" : ""));
  if (command === "list" && !Number.isNaN(since)) {
    return list(since, option(args, "--out") ?? "junk-accounts.csv");
  }
  if (command === "delete" && args[0] && !args[0].startsWith("--")) {
    return remove(args[0], since);
  }
  console.error("usage: junk-accounts.js list --since YYYY-MM-DD [--out file.csv]\n       junk-accounts.js delete file.csv");
  process.exitCode = 2;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
