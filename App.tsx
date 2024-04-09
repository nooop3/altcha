import React, { useState } from 'react';
import {
  GluestackUIProvider, StatusBar, Center,
  Heading, Box, VStack, Select, SelectTrigger, SelectInput,
  ChevronDownIcon, SelectIcon, SelectPortal, SelectBackdrop,
  SelectContent, SelectItem, SelectDragIndicatorWrapper, SelectDragIndicator, Icon,
  Button, ButtonText, Input, InputField,
  FormControl, Text, Slider, SliderTrack, SliderFilledTrack, SliderThumb,
  Divider, useToast, Toast, ToastTitle, ToastDescription, Pressable,
  CloseIcon
} from "@gluestack-ui/themed"
import { config } from "@gluestack-ui/config" // Optional if you want to use default theme

import { sha256, sha1 } from 'react-native-sha256';
import crypto from 'react-native-crypto';
// import QuickCrypto from 'react-native-quick-crypto';

const formatDuration = (ms: number) => {
  if (ms < 0) ms = -ms;
  const time = {
    day: Math.floor(ms / 86400000),
    hour: Math.floor(ms / 3600000) % 24,
    minute: Math.floor(ms / 60000) % 60,
    second: Math.floor(ms / 1000) % 60,
    millisecond: Math.floor(ms) % 1000
  };
  return Object.entries(time)
    .filter(val => val[1] !== 0)
    .map(([key, val]) => `${val} ${key}${val !== 1 ? 's' : ''}`)
    .join(', ');
};

const hashChallenge = async (salt: string, num: number, algorithm: string, cryptoPackage: string) => {
  const hashString = salt + num.toString();
  switch (cryptoPackage) {
    case 'react-native-sha256':
      switch (algorithm) {
        case 'SHA-256':
          return sha256(hashString);
        case 'SHA-1':
          return sha1(hashString);
        default:
          throw new Error('Invalid algorithm for react-native-sha256\nOnly SHA-256 and SHA-1 are supported');
      }
    case 'react-native-crypto':
      return crypto.createHash(algorithm.replace('-', '')).update(hashString).digest('hex')
    case 'react-native-quick-crypto':
      return QuickCrypto.createHash(algorithm.replace('-', '')).update(hashString).digest('hex')
    default:
      throw new Error('Invalid crypto package');
  }
}

const solveChallenge = async (challenge: string, salt: string, algorithm: string = 'SHA-256', max: number = 1e6, start: number = 0, cryptoPackage: string = 'react-native-sha256'): Promise<{ took: number, number: number }> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const next = (n: number) => {
      if (n > max) {
        reject(null);
      } else {
        hashChallenge(salt, n, algorithm, cryptoPackage).then((t) => {
          if (t === challenge) {
            resolve({
              number: n,
              took: Date.now() - startTime,
            });
          } else {
            next(n + 1);
          }
        }).catch(reject);
      }
    };
    next(start);
  });
}


const UnhandledErrorToast = (toast: any, error: Error) => {
  toast.show({
    placement: 'bottom',
    duration: null,
    render: ({ id }: { id: string }) => {
      const toastId = "toast-" + id;
      return (
        <Toast bg='$error700' nativeID={toastId} p='$3'>
          <Icon color='$white' mt='$1' mr='$3' />
          <VStack space='xs'>
            <ToastTitle color='$textLight50' >Unhandeled Error</ToastTitle>
            <ToastDescription color='$textLight50'>{error.message}</ToastDescription>
          </VStack>
          <Pressable mt='$1' onPress={() => toast.close(id)}>
            <Icon as={CloseIcon} color='$coolGray50' />
          </Pressable>
        </Toast>
      );
    },
  });
};

const AltChallenge = () => {
  const cryptoPackages = ['react-native-sha256', 'react-native-crypto', 'react-native-quick-crypto'];
  const [cryptoPackageSelected, setCryptoPackageSelected] = useState(cryptoPackages[0]);

  // algorithms
  const algorithms = ['sha-256', 'sha-512', 'sha-384', 'sha-224', 'sha-1', 'md5', 'rmd160'].map((algorithm) => algorithm.toUpperCase()); // Add more algorithms as needed
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(algorithms[0]);

  const numberRanger = [1, 10];
  const defaultMaxNumber = 5;
  const [maxNumber, setMaxNumber] = useState(defaultMaxNumber);

  const [secretNumber, setSecretNumber] = useState<number>();

  const [timeTook, setTimeTook] = useState<number>();

  const toast = useToast();

  const createTestChallenge = async (num: number, algorithm: string = 'SHA-256') => {
    const salt = Date.now().toString(16);
    const challenge = await hashChallenge(salt, num, algorithm, cryptoPackageSelected);
    return {
      algorithm,
      challenge,
      salt,
      signature: '',
    };
  }

  const handleCreateChallenge = async () => {
    try {
      const randomNumber = Math.floor(Math.random() * (10 ** maxNumber));
      setSecretNumber(randomNumber)
      // clear timeTook
      setTimeTook(undefined);
      const altcha = await createTestChallenge(randomNumber, selectedAlgorithm);

      const { algorithm, challenge, salt } = altcha;
      const resolved = await solveChallenge(challenge, salt, algorithm, 10 ** maxNumber, 0, cryptoPackageSelected);
      const { took } = resolved;
      setTimeTook(took);
    } catch (error) {
      console.log(error);
      UnhandledErrorToast(toast, error as Error);
    }

  }

  return (
    <FormControl
      width={"94%"}
      p="$4"
      borderWidth="$1"
      borderRadius="$lg"
      borderColor="$borderLight300"
      $dark-borderWidth="$1"
      $dark-borderRadius="$lg"
      $dark-borderColor="$borderDark800"
    >
      <VStack space={'xl'}>
        <Heading lineHeight="$md">
          Altcha Challenge Test
        </Heading>

        <VStack space="md">
          <Text lineHeight="$xs">
            Choose a package
          </Text>

          <Select defaultValue={cryptoPackageSelected} initialLabel={cryptoPackageSelected} onValueChange={setCryptoPackageSelected}>
            <SelectTrigger variant="outline">
              <SelectInput />
              <SelectIcon>
                <Icon as={ChevronDownIcon} />
              </SelectIcon>
            </SelectTrigger>
            <SelectPortal>
              <SelectBackdrop />
              <SelectContent>
                <SelectDragIndicatorWrapper>
                  <SelectDragIndicator />
                </SelectDragIndicatorWrapper>
                {cryptoPackages.map((cryptoPackage) => (
                  <SelectItem key={cryptoPackage} label={cryptoPackage} value={cryptoPackage} />
                ))}
              </SelectContent>
            </SelectPortal>
          </Select>
        </VStack>

        <VStack space="md">
          <Text lineHeight="$xs">
            Choose an algorithm
          </Text>

          <Select defaultValue={selectedAlgorithm} initialLabel={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
            <SelectTrigger variant="outline">
              <SelectInput />
              <SelectIcon>
                <Icon as={ChevronDownIcon} />
              </SelectIcon>
            </SelectTrigger>
            <SelectPortal>
              <SelectBackdrop />
              <SelectContent>
                <SelectDragIndicatorWrapper>
                  <SelectDragIndicator />
                </SelectDragIndicatorWrapper>
                {algorithms.map((algorithm) => (
                  <SelectItem key={algorithm} label={algorithm} value={algorithm} />
                ))}
              </SelectContent>
            </SelectPortal>
          </Select>
        </VStack>

        <VStack space="md">
          <Text lineHeight="$xs">
            Max number: {10 ** maxNumber} (10^{maxNumber})
          </Text>
          <Slider
            defaultValue={maxNumber}
            minValue={numberRanger[0]}
            maxValue={numberRanger[1]}
            onChange={setMaxNumber}
            size="md"
            orientation="horizontal"
            isDisabled={false}
            isReversed={false}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </VStack>

        <Button
          ml="auto"
          onPress={handleCreateChallenge}
        >
          <ButtonText>Test </ButtonText>
        </Button>

        <Divider bg="$trueGray300" $dark-bg="$backgroundDark700" />

        <VStack space="md">
          <Text lineHeight="$xs" aria-hidden={true}>
            Secret number: {secretNumber}
          </Text>
          <Text lineHeight="$xs">
            Time took: {timeTook !== undefined ? `${formatDuration(timeTook)}` : null}
          </Text>
        </VStack>
      </VStack>
    </FormControl>
  )
}
function App(): React.JSX.Element {
  return (
    <GluestackUIProvider config={config}>
      <StatusBar />
      <Center flex={1}>
        <AltChallenge />
      </Center>
    </GluestackUIProvider>
  );
}

export default App;