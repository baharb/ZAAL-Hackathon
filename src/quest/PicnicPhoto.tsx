// PicnicPhoto — one real picnic scene, shared by the finished-quest
// polaroid (Finale) and the album card (MyDaysScreen). Garden background,
// the tied balloons up top, Grandma and the buddy at the blanket's edges,
// the counted fruit in a row plus the dish on a mini checker blanket.
// Both places show the same photo — never an icon strip.

import React from 'react';
import { Image, View } from 'react-native';
import StripedBall from './StripedBall';
import WordArt from './WordArt';
import { COLOR_HEX } from './pickLists';
import { buddyPose } from './questTheme';
import { BuddyId } from './buddyStore';
import { DisplayWord } from './questGroups';

export default function PicnicPhoto({
  background,
  grandma,
  buddy,
  fruitWord,
  fruitCount,
  dishWord,
  balloonIds,
  colorHex,
  w,
  h,
  radius,
}: {
  background?: any;
  grandma?: any;
  buddy: BuddyId;
  fruitWord: DisplayWord | null;
  fruitCount: number;
  dishWord: DisplayWord | null;
  balloonIds: string[];
  colorHex: string;
  w: number;
  h: number;
  radius?: number;
}) {
  const castH = h * 0.52;
  return (
    <View style={{ width: w, height: h, borderRadius: radius ?? 0, overflow: 'hidden' }}>
      {background ? (
        <Image
          source={background}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#8FD694' }} />
      )}
      {balloonIds.length > 0 && (
        <View style={{ position: 'absolute', top: 2, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 2 }}>
          {balloonIds.map(id => (
            <StripedBall key={id} color={COLOR_HEX[id] ?? '#CCCCCC'} size={h * 0.16} />
          ))}
        </View>
      )}
      {grandma ? (
        <Image
          source={grandma}
          style={{ position: 'absolute', left: 4, bottom: 2, width: castH * 0.85, height: castH }}
          resizeMode="contain"
        />
      ) : null}
      <Image
        source={buddyPose(buddy, 'celebration')}
        style={{ position: 'absolute', right: 4, bottom: 2, width: castH * 0.85, height: castH }}
        resizeMode="contain"
      />
      <View
        style={{
          position: 'absolute',
          left: castH * 0.7,
          right: castH * 0.7,
          bottom: 2,
          height: h * 0.36,
          borderRadius: 6,
          overflow: 'hidden',
          backgroundColor: colorHex,
          borderWidth: 1.5,
          borderColor: '#FFFFFF',
          flexDirection: 'row',
          flexWrap: 'wrap',
        }}
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <View
            key={i}
            style={{
              width: '12.5%',
              height: '50%',
              backgroundColor: (Math.floor(i / 8) + i) % 2 === 0 ? colorHex : 'rgba(255,255,255,0.88)',
            }}
          />
        ))}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          {fruitWord &&
            Array.from({ length: Math.min(Math.max(fruitCount, 1), 5) }).map((_, i) => (
              <WordArt key={i} word={fruitWord} size={h * 0.15} />
            ))}
          {dishWord && <WordArt word={dishWord} size={h * 0.24} />}
        </View>
      </View>
    </View>
  );
}
