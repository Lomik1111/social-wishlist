import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

interface GradientViewProps {
  colors: readonly string[] | string[];
  style?: ViewStyle;
  children?: React.ReactNode;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

let gradientIdCounter = 0;

export function GradientView({
  colors,
  style,
  children,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
}: GradientViewProps) {
  const id = React.useRef(`grad_${++gradientIdCounter}`).current;

  return (
    <View style={[styles.container, style]}>
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient
            id={id}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
          >
            {colors.map((color, index) => (
              <Stop
                key={index}
                offset={
                  colors.length === 1
                    ? '0%'
                    : `${(index / (colors.length - 1)) * 100}%`
                }
                stopColor={color}
                stopOpacity={1}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
