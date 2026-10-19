/// <reference types="expo-router/types" />
/// <reference types="jest" />

declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_URL?: string;
  }
}
