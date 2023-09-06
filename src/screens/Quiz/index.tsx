import { useEffect, useState } from "react";
import { Alert, Text, View, BackHandler } from "react-native";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";

import { GestureDetector, Gesture } from "react-native-gesture-handler";

import { useNavigation, useRoute } from "@react-navigation/native";

import Animated, {
  Easing,
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

import { styles } from "./styles";

import { QUIZ } from "../../data/quiz";
import { historyAdd } from "../../storage/quizHistoryStorage";

import { Loading } from "../../components/Loading";
import { Question } from "../../components/Question";
import { QuizHeader } from "../../components/QuizHeader";
import { ConfirmButton } from "../../components/ConfirmButton";
import { OutlineButton } from "../../components/OutlineButton";
import { ProgressBar } from "../../components/ProgressBar";
import { THEME } from "../../styles/theme";
import { OverlayFeedback } from "../../components/OverlayFeedback";

interface Params {
  id: string;
}

type QuizProps = (typeof QUIZ)[0];

const CARD_INCLINATION = 10;
const CARD_SKIP_AREA = -200;

export function Quiz() {
  const [points, setPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [quiz, setQuiz] = useState<QuizProps>({} as QuizProps);
  const [alternativeSelected, setAlternativeSelected] = useState<null | number>(
    null
  );
  const [statusReply, setStatusReply] = useState<number>(0);

  const shake = useSharedValue(0);
  const scrollInY = useSharedValue(0);
  const cardPosition = useSharedValue(0);

  const { navigate } = useNavigation();

  const route = useRoute();
  const { id } = route.params as Params;

  async function playSound(isCorrect: boolean) {
    const file = isCorrect
      ? require(`../../assets/correct.mp3`)
      : require(`../../assets/wrong.mp3`);

    const { sound } = await Audio.Sound.createAsync(file, { shouldPlay: true });

    if (!sound) return;

    await sound.setPositionAsync(0);
    await sound.playAsync();
  }

  function handleSkipConfirm() {
    Alert.alert("Pular", "Deseja realmente pular a questão?", [
      { text: "Sim", onPress: () => handleNextQuestion() },
      { text: "Não", onPress: () => {} },
    ]);
  }

  async function handleFinished() {
    await historyAdd({
      id: new Date().getTime().toString(),
      title: quiz.title,
      level: quiz.level,
      points,
      questions: quiz.questions.length,
    });

    navigate("finish", {
      points: String(points),
      total: String(quiz.questions.length),
    });
  }

  function handleNextQuestion() {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion((prevState) => prevState + 1);
    } else {
      handleFinished();
    }
  }

  async function handleConfirm() {
    if (alternativeSelected === null) {
      return handleSkipConfirm();
    }

    if (quiz.questions[currentQuestion].correct === alternativeSelected) {
      await playSound(true);
      setStatusReply(1);
      setPoints((prevState) => prevState + 1);
    } else {
      await playSound(false);
      setStatusReply(2);
      shakeAnimation();
    }

    setAlternativeSelected(null);
  }

  function handleStop() {
    Alert.alert("Parar", "Deseja parar agora?", [
      {
        text: "Não",
        style: "cancel",
      },
      {
        text: "Sim",
        style: "destructive",
        onPress: () => navigate("home"),
      },
    ]);

    return true;
  }

  async function shakeAnimation() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    shake.value = withSequence(
      withTiming(3, { duration: 200, easing: Easing.bounce }),
      withTiming(0, undefined, (finished) => {
        "worklet";
        if (finished) {
          runOnJS(handleNextQuestion)();
        }
      })
    );
  }

  const shakeStyleAnimated = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          shake.value,
          [0, 0.5, 1, 1.5, 2, 2.5, 3],
          [0, -15, 0, 15, 0, -15, 0]
        ),
      },
    ],
  }));

  const fixedProgressBarStyles = useAnimatedStyle(() => ({
    position: "absolute",
    paddingTop: 50,
    backgroundColor: THEME.COLORS.GREY_500,
    width: "110%",
    left: "-5%",
    opacity: interpolate(scrollInY.value, [60, 100], [0, 1], Extrapolate.CLAMP),
    transform: [
      {
        translateY: interpolate(
          scrollInY.value,
          [60, 100],
          [-50, 0],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  const headerStyleAnimated = useAnimatedStyle(() => ({
    opacity: interpolate(scrollInY.value, [40, 80], [1, 0]),
  }));

  const dragStyleAnimated = useAnimatedStyle(() => {
    const rotateZ = cardPosition.value / CARD_INCLINATION;

    return {
      transform: [
        { translateX: cardPosition.value },
        { rotateZ: `${rotateZ}deg` },
      ],
    };
  });

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollInY.value = event.contentOffset.y;
    },
  });

  const onPan = Gesture.Pan()
    .activateAfterLongPress(200)
    .onUpdate((event) => {
      const isMovingToRight: boolean = event.translationX > 15;

      if (isMovingToRight) return;

      cardPosition.value = event.translationX;
    })
    .onEnd(() => {
      if (cardPosition.value < CARD_SKIP_AREA) {
        runOnJS(handleNextQuestion)();
      }
      cardPosition.value = withTiming(0);
    });

  useEffect(() => {
    const quizSelected = QUIZ.filter((item) => item.id === id)[0];
    setQuiz(quizSelected);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (quiz.questions) {
      handleNextQuestion();
    }
  }, [points]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleStop
    );

    return () => backHandler.remove();
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <OverlayFeedback status={statusReply} />
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.question}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <Animated.View style={[styles.header, headerStyleAnimated]}>
          <QuizHeader
            title={quiz.title}
            currentQuestion={currentQuestion + 1}
            totalOfQuestions={quiz.questions.length}
          />
        </Animated.View>

        <GestureDetector gesture={onPan}>
          <Animated.View style={[shakeStyleAnimated, dragStyleAnimated]}>
            <Question
              key={quiz.questions[currentQuestion].title}
              question={quiz.questions[currentQuestion]}
              alternativeSelected={alternativeSelected}
              setAlternativeSelected={setAlternativeSelected}
              onUnmount={() => setStatusReply(0)}
            />
          </Animated.View>
        </GestureDetector>

        <View style={styles.footer}>
          <OutlineButton title="Parar" onPress={handleStop} />
          <ConfirmButton onPress={handleConfirm} />
        </View>
      </Animated.ScrollView>

      <Animated.View style={fixedProgressBarStyles}>
        <Text style={styles.title}>{quiz.title}</Text>
        <ProgressBar
          total={quiz.questions.length}
          current={currentQuestion + 1}
        />
      </Animated.View>
    </View>
  );
}
