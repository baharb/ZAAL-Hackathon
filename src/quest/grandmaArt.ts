// Each buddy has their own grandma for the picnic, in
// assets/neli-world/characters/Family/<buddyId>/ (PNGs; Neli's is the
// .webp). Same art in the picnic scene, the photo card and the album
// card. Falls back to Neli's grandma for any unknown buddy.

import { ImageSourcePropType } from 'react-native';
import { BuddyId } from './buddyStore';

const GRANDMAS: Record<BuddyId, ImageSourcePropType> = {
  neli: require('../../assets/neli-world/characters/Family/neli/mamanbozorg.webp'),
  aidin: require('../../assets/neli-world/characters/Family/aidin/mamanbozorg.png'),
  mila: require('../../assets/neli-world/characters/Family/mila/mamanbozorg.png'),
  lila: require('../../assets/neli-world/characters/Family/lila/mamanbozorg.png'),
  dara: require('../../assets/neli-world/characters/Family/dara/mamanbozorg.png'),
  roboBoombo: require('../../assets/neli-world/characters/Family/roboBoombo/mamanbozorg.png'),
};

export function grandmaArtFor(buddy: BuddyId | string | null | undefined): ImageSourcePropType {
  return (buddy && GRANDMAS[buddy as BuddyId]) || GRANDMAS.neli;
}
