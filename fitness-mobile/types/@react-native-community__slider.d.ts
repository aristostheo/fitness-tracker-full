declare module "@react-native-community/slider" {
  import { ComponentType } from "react";
  import { SliderProps as RNSliderProps } from "react-native";

  type SliderProps = RNSliderProps;

  const SliderComponent: ComponentType<SliderProps>;

  export const Slider: ComponentType<SliderProps>;
  export default SliderComponent;
}
