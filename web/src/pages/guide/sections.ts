import type { ComponentType } from 'react'
import { ActivityGuide } from './content/ActivityGuide'
import { Analyzing } from './content/Analyzing'
import { CollectingData } from './content/CollectingData'
import { Comparing } from './content/Comparing'
import { GettingStarted } from './content/GettingStarted'
import { Reference } from './content/Reference'
import { TestsGuide } from './content/TestsGuide'
import { Troubleshooting } from './content/Troubleshooting'
import { Uploading } from './content/Uploading'

export interface GuideSection {
  slug: string
  title: string
  /** One line for the contents list. */
  summary: string
  /**
   * The page heading and search title when it differs from the short title: the short title followed by
   * what riders search for. The contents list and next/previous links keep the short title.
   */
  headline?: string
  /** Search result description; otherwise built from the summary. */
  description?: string
  Content: ComponentType
}

/** The user guide, in reading order. Slugs are part of URLs that the app links to: keep them stable. */
export const GUIDE_SECTIONS: GuideSection[] = [
  {
    slug: 'getting-started',
    title: 'Getting started',
    summary: 'What MyCdA estimates, how, and setting up your profile',
    headline: 'Getting started: measure CdA and Crr with a power meter',
    description: 'What CdA and Crr are, how MyCdA estimates them from a power meter ride with the virtual elevation method, and how to set up your profile.',
    Content: GettingStarted
  },
  {
    slug: 'collecting-data',
    title: 'Collecting test data',
    summary: 'Equipment, courses and a protocol that gives repeatable results',
    headline: 'Collecting test data: how to do an aero field test',
    description: 'A CdA test protocol for aero field testing: the equipment, choosing a loop or out-and-back course, wind, and riding runs that give repeatable results.',
    Content: CollectingData
  },
  { slug: 'uploading', title: 'Uploading activities', summary: 'Supported files, processing, and the activity list', Content: Uploading },
  { slug: 'activity', title: 'The activity page', summary: 'Chart, map, selecting laps and ranges, loops, ride settings', Content: ActivityGuide },
  {
    slug: 'tests',
    title: 'The Tests table',
    summary: 'Every test of a ride on one screen, fitted and saved together',
    headline: 'The Tests table: fit out-and-back aero tests',
    description: "Pair the out and back legs of each aero test automatically, fit every test's CdA with the same parameters, and save a whole session at once.",
    Content: TestsGuide
  },
  {
    slug: 'analysis',
    title: 'Analyzing a run',
    summary: 'Virtual elevation, parameters, Suggest CdA, air speed and saving',
    headline: 'Analyzing a run: virtual elevation (Chung method)',
    description: "Read the virtual elevation chart, fit CdA and Crr with Robert Chung's method, set air density and wind, and save the analysis.",
    Content: Analyzing
  },
  {
    slug: 'comparing',
    title: 'Comparing setups',
    summary: 'Baselines, watts saved, and telling real differences from noise',
    headline: 'Comparing setups: watts and seconds saved',
    description: 'Compare aero setups against a baseline in watts and seconds saved, and tell real CdA differences from the scatter between runs.',
    Content: Comparing
  },
  {
    slug: 'troubleshooting',
    title: 'Troubleshooting',
    summary: "When the numbers don't make sense",
    headline: "Troubleshooting: when CdA estimates don't make sense",
    Content: Troubleshooting
  },
  { slug: 'reference', title: 'Reference', summary: 'Glossary, CSV format, the physics, privacy and further reading', Content: Reference }
]

export const guideSection = (slug: string | undefined) => GUIDE_SECTIONS.find((s) => s.slug === slug)
