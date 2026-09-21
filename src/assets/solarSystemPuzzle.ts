import { ImageSourcePropType } from 'react-native';

export const SOLAR_SYSTEM_BACKGROUND: ImageSourcePropType = require('../../assets/neli-world/puzzle/Solarsystem/solarsystem.webp');

export type SolarSystemPlanet = {
  id: string;
  labelFa: string;
  source: ImageSourcePropType;
  sizeFactor: number;
  slotX: number;
  slotY: number;
  orbitY: number;
};

export const LEGACY_SOLAR_SYSTEM_PLANETS: SolarSystemPlanet[] = [
  {
    id: 'mercury',
    labelFa: 'تیر',
    source: require('../../assets/neli-world/puzzle/Solarsystem/planets/mercury.webp'),
    sizeFactor: 2.05,
    slotX: 0.325,
      slotY: 0.451,
      orbitY: 0.451,
  },
  {
    id: 'venus',
    labelFa: 'ونوس',
    source: require('../../assets/neli-world/puzzle/Solarsystem/planets/venus.webp'),
    sizeFactor: 4.87,
    slotX: 0.41,
      slotY: 0.451,
      orbitY: 0.451,
  },
  {
    id: 'earth',
    labelFa: 'زمین',
    source: require('../../assets/neli-world/puzzle/Solarsystem/planets/earth.webp'),
    sizeFactor: 5.15,
    slotX: 0.495,
    slotY: 0.41,
    orbitY: 0.41,
  },
  {
    id: 'moon',
    labelFa: 'ماه',
    source: require('../../assets/neli-world/puzzle/Solarsystem/planets/moon.webp'),
    sizeFactor: 0.15525,
    slotX: 0.455,
    slotY: 0.232,
    orbitY: 0.232,
  },
  {
    id: 'mars',
    labelFa: 'مریخ',
    source: require('../../assets/neli-world/puzzle/Solarsystem/planets/mars.webp'),
    sizeFactor: 2.71,
    slotX: 0.59,
    slotY: 0.41,
    orbitY: 0.41,
  },
  {
    id: 'jupiter',
    labelFa: 'مشتری',
    source: require('../../assets/neli-world/puzzle/Solarsystem/planets/jupiter.webp'),
    sizeFactor: 43.1,
    slotX: 0.675,
    slotY: 0.41,
    orbitY: 0.41,
  },
  {
    id: 'saturn',
    labelFa: 'کیوان',
    source: require('../../assets/neli-world/puzzle/Solarsystem/planets/saturn.webp'),
    sizeFactor: 36,
    slotX: 0.75,
    slotY: 0.41,
    orbitY: 0.41,
  },
  {
    id: 'uranus',
    labelFa: 'اورانوس',
    source: require('../../assets/neli-world/puzzle/Solarsystem/planets/uranus.webp'),
    sizeFactor: 14.6,
    slotX: 0.835,
    slotY: 0.41,
    orbitY: 0.41,
  },
  {
    id: 'neptune',
    labelFa: 'نپتون',
    source: require('../../assets/neli-world/puzzle/Solarsystem/planets/neptune.webp'),
    sizeFactor: 14.4,
    slotX: 0.905,
    slotY: 0.41,
    orbitY: 0.41,
  },
] as const;

export const REAL_SOLAR_SYSTEM_PLANETS: SolarSystemPlanet[] = [
  {
    id: 'mercury',
    labelFa: 'تیر',
    source: require('../../assets/neli-world/puzzle/Solarsystem/planets/mercury.webp'),
    sizeFactor: 1.243025,
    slotX: 0.325,
    slotY: 0.41,
    orbitY: 0.41,
  },
  {
    id: 'venus',
    labelFa: 'ونوس',
    source: require('../../assets/neli-world/puzzle/Solarsystem/planets/venus.webp'),
    sizeFactor: 1.564562304,
    slotX: 0.41,
    slotY: 0.4715,
    orbitY: 0.4715,
  },
  {
    id: 'earth',
    labelFa: 'زمین',
    source: require('../../assets/neli-world/puzzle/Solarsystem/planets/earth.webp'),
    sizeFactor: 1.647703296,
    slotX: 0.495,
    slotY: 0.369,
    orbitY: 0.369,
  },
  {
    id: 'moon',
    labelFa: 'ماه',
    source: require('../../assets/neli-world/puzzle/Solarsystem/planets/moon.webp'),
    sizeFactor: 0.761805,
    slotX: 0.4745,
    slotY: 0.2786,
    orbitY: 0.2786,
  },
  {
    id: 'mars',
    labelFa: 'مریخ',
    source: require('../../assets/neli-world/puzzle/Solarsystem/planets/mars.webp'),
    sizeFactor: 1.3699368,
    slotX: 0.5818,
    slotY: 0.5125,
    orbitY: 0.5125,
  },
  {
    id: 'jupiter',
    labelFa: 'مشتری',
    source: require('../../assets/neli-world/puzzle/Solarsystem/planets/jupiter.webp'),
    sizeFactor: 3.74969496111664,
    slotX: 0.666,
    slotY: 0.2868,
    orbitY: 0.2868,
  },
  {
    id: 'saturn',
    labelFa: 'کیوان',
    source: require('../../assets/neli-world/puzzle/Solarsystem/planets/saturn.webp'),
    sizeFactor: 4.040356056674289,
    slotX: 0.7372,
    slotY: 0.5743,
    orbitY: 0.5743,
  },
  {
    id: 'uranus',
    labelFa: 'اورانوس',
    source: require('../../assets/neli-world/puzzle/Solarsystem/planets/uranus.webp'),
    sizeFactor: 2.9848758016532,
    slotX: 0.835,
    slotY: 0.3075,
    orbitY: 0.3075,
  },
  {
    id: 'neptune',
    labelFa: 'نپتون',
    source: require('../../assets/neli-world/puzzle/Solarsystem/planets/neptune.webp'),
    sizeFactor: 2.239733577536,
    slotX: 0.905,
    slotY: 0.5125,
    orbitY: 0.5125,
  },
] as const;

export const SOLAR_SYSTEM_PLANETS = REAL_SOLAR_SYSTEM_PLANETS;
