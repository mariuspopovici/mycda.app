/** A problem with an uploaded file whose message can be shown to the user as-is. */
class ActivityFileError extends Error {
  constructor(message) {
    super(message);
    this.name = "ActivityFileError";
  }
}

module.exports = { ActivityFileError };
