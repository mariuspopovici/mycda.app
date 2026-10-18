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
  Content: ComponentType
}

/** The user guide, in reading order. Slugs are part of URLs that the app links to: keep them stable. */
export const GUIDE_SECTIONS: GuideSection[] = [
  { slug: 'getting-started', title: 'Getting started', summary: 'What MyCdA estimates, how, and setting up your profile', Content: GettingStarted },
  { slug: 'collecting-data', title: 'Collecting test data', summary: 'Equipment, courses and a protocol that gives repeatable results', Content: CollectingData },
  { slug: 'uploading', title: 'Uploading activities', summary: 'Supported files, processing, and the activity list', Content: Uploading },
  { slug: 'activity', title: 'The activity page', summary: 'Chart, map, selecting laps and ranges, loops, ride settings', Content: ActivityGuide },
  { slug: 'tests', title: 'The Tests table', summary: 'Every test of a ride on one screen, fitted and saved together', Content: TestsGuide },
  { slug: 'analysis', title: 'Analyzing a run', summary: 'Virtual elevation, parameters, Suggest CdA, air speed and saving', Content: Analyzing },
  { slug: 'comparing', title: 'Comparing setups', summary: 'Baselines, watts saved, and telling real differences from noise', Content: Comparing },
  { slug: 'troubleshooting', title: 'Troubleshooting', summary: "When the numbers don't make sense", Content: Troubleshooting },
  { slug: 'reference', title: 'Reference', summary: 'Glossary, CSV format, the physics, privacy and further reading', Content: Reference }
]

export const guideSection = (slug: string | undefined) => GUIDE_SECTIONS.find((s) => s.slug === slug)
