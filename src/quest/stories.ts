// Quest v2 stories (section 3). One entry for now: picnic with Grandma.
// More stories and backgrounds can be added later without changing the
// game code — DriveGame only reads this list.

import { ImageSourcePropType } from 'react-native';
import { FaTestAudioKey } from '../assets/faTestAudio.generated';

export type StoryId = 'picnic_grandma';

export type Story = {
  id: StoryId;
  titleFa: string;
  titleEn: string;
  background: ImageSourcePropType;
  destination: ImageSourcePropType;
  grandma: ImageSourcePropType;
  /** Played when the car reaches the picnic. */
  arrivalAudio: FaTestAudioKey;
  /** Played in the finale, after all items are on the blanket. */
  praiseAudio: FaTestAudioKey;
};

export const STORIES: Story[] = [
  {
    id: 'picnic_grandma',
    titleFa: 'سفر نلی: پیک‌نیک با مادربزرگ',
    titleEn: "Neli's Drive: picnic with Grandma",
    background: require('../../assets/neli-world/quest/garden-background.png'),
    destination: require('../../assets/neli-world/quest/landmarks/picnic.png'),
    grandma: require('../../assets/neli-world/characters/Grandma/grandma_standing.webp'),
    arrivalAudio: 'grandma-call/grandma/salam',
    praiseAudio: 'grandma-call/grandma/afarin',
  },
];
