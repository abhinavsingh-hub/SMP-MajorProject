/* eslint-disable @typescript-eslint/no-explicit-any */
declare namespace React {
  export type FC<P = Record<string, unknown>> = (props: P) => any;
  export type ReactNode = any;
  export type ReactElement = any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface Element {
    [elemName: string]: any;
  }
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module 'react' {
  export function useState<T>(initial: T | (() => T)): [T, (val: T | ((prev: T) => T)) => void];
  export function useEffect(fn: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useRef<T>(initial?: T): { current: T };
  export function useReducer<R extends (state: any, action: any) => any>(
    reducer: R,
    initialState: ReturnType<R>,
  ): [ReturnType<R>, (action: Parameters<R>[1]) => void];
  export type FC<P = Record<string, unknown>> = (props: P) => any;
  export type ReactNode = any;
  export type ReactElement = any;
  const React: any;
  export default React;
}

declare module 'react-native' {
  export const View: any;
  export const Text: any;
  export const TextInput: any;
  export const TouchableOpacity: any;
  export const ScrollView: any;
  export type ScrollView = any;
  export const SafeAreaView: any;
  export const ActivityIndicator: any;
  export const StyleSheet: {
    create: <T extends Record<string, any>>(styles: T) => T;
  };
  export const AppRegistry: {
    registerComponent: (name: string, fn: () => any) => void;
  };
}
