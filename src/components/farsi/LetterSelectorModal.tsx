import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FarsiLetter } from '../../data/farsiLetters';
import { FA } from '../../theme/fonts';

type Props = {
  visible: boolean;
  letters: FarsiLetter[];
  selectedId: string;
  onClose: () => void;
  onSelect: (index: number) => void;
};

export default function LetterSelectorModal({ visible, letters, selectedId, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Select a Letter</Text>
            <Text style={styles.titleFa}>انتخاب حرف</Text>
          </View>
          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {letters.map((item, index) => {
              const active = item.id === selectedId;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.tile, active && styles.tileActive, { borderColor: item.color ?? '#F15A7B' }]}
                  onPress={() => onSelect(index)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.letter, { color: item.color ?? '#F15A7B' }]}>{item.letter}</Text>
                  <Text style={styles.nameFa} numberOfLines={1}>{item.nameFa}</Text>
                  <Text style={styles.nameEn} numberOfLines={1}>{item.nameEn}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 11, 31, 0.54)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  sheet: {
    width: '100%',
    maxWidth: 980,
    maxHeight: '88%',
    backgroundColor: '#FFFDF8',
    borderRadius: 28,
    padding: 18,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2F2340',
  },
  titleFa: {
    fontSize: 13,
    color: '#8A7A9B',
    marginTop: 2,
  },
  grid: {
    // Alef starts at the right and the alphabet reads right-to-left, same as
    // the AlphabetHub grid this mirrors.
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 12,
  },
  tile: {
    width: 84,
    minHeight: 100,
    borderWidth: 2,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  tileActive: {
    backgroundColor: '#F2ECFF',
  },
  letter: {
    fontSize: 32,
    fontFamily: FA.black,
  },
  nameFa: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: FA.bold,
    color: '#2F2340',
  },
  nameEn: {
    marginTop: 2,
    fontSize: 10,
    color: '#7D748E',
  },
});
