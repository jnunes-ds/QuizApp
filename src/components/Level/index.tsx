import { Pressable, PressableProps } from "react-native";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolateColor,
} from "react-native-reanimated";

import { THEME } from "../../styles/theme";
import { styles } from "./styles";
import { useEffect } from "react";

const TYPE_COLORS = {
  EASY: THEME.COLORS.BRAND_LIGHT,
  HARD: THEME.COLORS.DANGER_LIGHT,
  MEDIUM: THEME.COLORS.WARNING_LIGHT,
};

type Props = PressableProps & {
  title: string;
  isChecked?: boolean;
  type?: keyof typeof TYPE_COLORS;
};

export function Level({
  title,
  type = "EASY",
  isChecked = false,
  ...rest
}: Props) {
  const COLOR = TYPE_COLORS[type];

  const scale = useSharedValue(1);
  const checked = useSharedValue(1);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(
      checked.value,
      [0, 1],
      ["transparent", TYPE_COLORS[type]]
    ),
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      checked.value,
      [0, 1],
      [COLOR, THEME.COLORS.GREY_100]
    ),
  }));

  function onPressIn() {
    scale.value = withTiming(1.5, { duration: 1000 });
  }

  function onPressOut() {
    scale.value = withTiming(1, { easing: Easing.bounce });
  }

  useEffect(() => {
    checked.value = withTiming(isChecked ? 1 : 0, { duration: 500 });
  }, [isChecked]);

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} {...rest}>
      <Animated.View
        style={[
          styles.container,
          animatedContainerStyle,
          {
            borderColor: COLOR,
          },
        ]}
      >
        <Animated.Text style={[styles.title, animatedTextStyle]}>
          {title}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}
