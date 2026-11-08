/**
 * RIT's 11 colleges as the home carousel, the college filter and the course
 * page show them: a short name, a photo, an original mark and a pastel tint.
 * The API stores a course's college as its full name, so `collegeForName`
 * matches it by keywords. Owner: FE1 (#20, #21).
 *
 * The marks are originals made for this project, not RIT's official logos.
 * Photos are from Unsplash; their credits are in PHOTO_CREDITS.
 */
import artPhoto from '../assets/colleges/photos/art.jpg'
import businessPhoto from '../assets/colleges/photos/business.jpg'
import computingPhoto from '../assets/colleges/photos/computing.jpg'
import engineeringPhoto from '../assets/colleges/photos/engineering.jpg'
import engtechPhoto from '../assets/colleges/photos/engtech.jpg'
import healthPhoto from '../assets/colleges/photos/health.jpg'
import individualizedPhoto from '../assets/colleges/photos/individualized.jpg'
import liberalartsPhoto from '../assets/colleges/photos/liberalarts.jpg'
import ntidPhoto from '../assets/colleges/photos/ntid.jpg'
import sciencePhoto from '../assets/colleges/photos/science.jpg'
import sustainabilityPhoto from '../assets/colleges/photos/sustainability.jpg'
import artMark from '../assets/colleges/marks/art.svg'
import businessMark from '../assets/colleges/marks/business.svg'
import computingMark from '../assets/colleges/marks/computing.svg'
import engineeringMark from '../assets/colleges/marks/engineering.svg'
import engtechMark from '../assets/colleges/marks/engtech.svg'
import healthMark from '../assets/colleges/marks/health.svg'
import individualizedMark from '../assets/colleges/marks/individualized.svg'
import liberalartsMark from '../assets/colleges/marks/liberalarts.svg'
import ntidMark from '../assets/colleges/marks/ntid.svg'
import scienceMark from '../assets/colleges/marks/science.svg'
import sustainabilityMark from '../assets/colleges/marks/sustainability.svg'

export type Tint = 'peach' | 'teal' | 'lilac' | 'butter' | 'mint'

export interface College {
  key: string
  /** Short name for cards and chips. */
  name: string
  /** RIT's full name for the college. */
  fullName: string
  photo: string
  photoAlt: string
  mark: string
  tint: Tint
  /** Lowercase words that identify the college inside the API's college name. */
  match: readonly string[]
}

export const COLLEGES: readonly College[] = [
  { key: 'art', name: 'Art & Design', fullName: 'College of Art and Design', photo: artPhoto, photoAlt: 'Paint brushes and color swatches', mark: artMark, tint: 'peach', match: ['art and design', 'art & design'] },
  { key: 'business', name: 'Business', fullName: 'Saunders College of Business', photo: businessPhoto, photoAlt: 'A team planning around a laptop', mark: businessMark, tint: 'lilac', match: ['saunders', 'business'] },
  { key: 'computing', name: 'Computing', fullName: 'Golisano College of Computing and Information Sciences', photo: computingPhoto, photoAlt: 'Code on a computer monitor', mark: computingMark, tint: 'teal', match: ['computing and information', 'gccis'] },
  { key: 'engineering', name: 'Engineering', fullName: 'Kate Gleason College of Engineering', photo: engineeringPhoto, photoAlt: 'A robotic arm in a lab', mark: engineeringMark, tint: 'butter', match: ['gleason', 'college of engineering'] },
  { key: 'engtech', name: 'Engineering Tech', fullName: 'College of Engineering Technology', photo: engtechPhoto, photoAlt: 'A circuit board being soldered', mark: engtechMark, tint: 'mint', match: ['engineering technology', 'college of engineering technology'] },
  { key: 'health', name: 'Health Sciences', fullName: 'College of Health Sciences and Technology', photo: healthPhoto, photoAlt: 'A stethoscope on a desk', mark: healthMark, tint: 'peach', match: ['health'] },
  { key: 'liberalarts', name: 'Liberal Arts', fullName: 'College of Liberal Arts', photo: liberalartsPhoto, photoAlt: 'Shelves of library books', mark: liberalartsMark, tint: 'lilac', match: ['liberal arts'] },
  { key: 'ntid', name: 'NTID', fullName: 'National Technical Institute for the Deaf', photo: ntidPhoto, photoAlt: 'Students talking in sign language', mark: ntidMark, tint: 'teal', match: ['ntid', 'deaf'] },
  { key: 'science', name: 'Science', fullName: 'College of Science', photo: sciencePhoto, photoAlt: 'Glassware in a science lab', mark: scienceMark, tint: 'butter', match: ['college of science'] },
  { key: 'sustainability', name: 'Sustainability', fullName: 'Golisano Institute for Sustainability', photo: sustainabilityPhoto, photoAlt: 'Wind turbines on a hill', mark: sustainabilityMark, tint: 'mint', match: ['sustainability'] },
  { key: 'individualized', name: 'Individualized Study', fullName: 'School of Individualized Study', photo: individualizedPhoto, photoAlt: 'A notebook and a compass on a map', mark: individualizedMark, tint: 'lilac', match: ['individualized'] },
]

export const PHOTO_CREDITS =
  'College photos from Unsplash by Matthieu Comoy, Campaign Creators, Ilya Pavlov, Franck V., Vishnu Mohanan, ' +
  'Hush Naidoo Jade Photography, Susan Q Yin, New York Said, ThisisEngineering, American Public Power Association and Hendrik Morkel.'

export function collegeByKey(key: string | null | undefined): College | null {
  return COLLEGES.find((college) => college.key === key) ?? null
}

// Longest keyword first, so "College of Engineering Technology" isn't read as "College of Engineering".
const BY_KEYWORD = COLLEGES.flatMap((college) => college.match.map((word) => ({ word, college }))).sort(
  (a, b) => b.word.length - a.word.length,
)

/** The college for an API college name such as "College of Liberal Arts", or null if none matches. */
export function collegeForName(name: string | null | undefined): College | null {
  if (!name) return null
  const text = name.toLowerCase()
  return BY_KEYWORD.find(({ word }) => text.includes(word))?.college ?? null
}
