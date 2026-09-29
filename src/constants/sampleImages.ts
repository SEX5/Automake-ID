import femalePortrait from '../assets/images/sample_portrait_female_1790648265601.jpg';
import malePortrait from '../assets/images/sample_portrait_male_1790648278885.jpg';

export interface SamplePhoto {
  id: string;
  name: string;
  role: string;
  src: string;
}

export const SAMPLE_PHOTOS: SamplePhoto[] = [
  {
    id: 'sample_female',
    name: 'Elena Rostova',
    role: 'Passport / Visa Sample',
    src: femalePortrait,
  },
  {
    id: 'sample_male',
    name: 'Marcus Vance',
    role: 'Corporate ID Badge Sample',
    src: malePortrait,
  },
];
