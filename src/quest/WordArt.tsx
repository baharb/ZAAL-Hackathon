// One quest word picture (hackathon step 2).
// Real words show their catalog art; number words show a big Farsi digit
// drawn by the app (they have recordings but no pictures).

import React, { useContext } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { AppContext } from '../store/AppContext';
import { dir, ff } from '../theme/fonts';
import { DisplayWord } from './questGroups';

export default function WordArt({ word, size }: { word: DisplayWord; size: number }) {
  const { lang } = useContext(AppContext);
  if (word.art) {
    return (
      <Image
        source={word.art}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityLabel={word.fa}
      />
    );
  }
  return (
    <View style={[styles.digitBox, { width: size, height: size, borderRadius: size * 0.24 }]}>
      <Text
        style={[styles.digit, { fontFamily: ff(lang, 'black'), fontSize: size * 0.52 }, dir(lang)]}
        accessibilityLabel={word.fa}
      >
        {word.digit ?? word.fa}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  digitBox: {
    backgroundColor: '#6C4EFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
