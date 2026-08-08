"use client";

/**
 * Every icon in the app, mapped to a Phosphor icon under an app-semantic name.
 *
 * Imports come from `dist/csr/<Name>` rather than the package root: the barrel
 * pulls all ~1500 icons into the module graph, which is slow in dev and relies
 * on bundler tree-shaking to undo. Weight is set once by IconProvider below, so
 * call sites render `<UndoIcon />` with no per-icon styling.
 */

import { ApertureIcon } from "@phosphor-icons/react/dist/csr/Aperture";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { ArrowsCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowsCounterClockwise";
import { ArrowUUpLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowUUpLeft";
import { ArrowUUpRightIcon } from "@phosphor-icons/react/dist/csr/ArrowUUpRight";
import { CircleIcon } from "@phosphor-icons/react/dist/csr/Circle";
import { CircleHalfIcon } from "@phosphor-icons/react/dist/csr/CircleHalf";
import { CropIcon as PhCropIcon } from "@phosphor-icons/react/dist/csr/Crop";
import { DiamondIcon } from "@phosphor-icons/react/dist/csr/Diamond";
import { DropIcon } from "@phosphor-icons/react/dist/csr/Drop";
import { DropHalfIcon } from "@phosphor-icons/react/dist/csr/DropHalf";
import { EyedropperIcon } from "@phosphor-icons/react/dist/csr/Eyedropper";
import { FlipHorizontalIcon as PhFlipHorizontalIcon } from "@phosphor-icons/react/dist/csr/FlipHorizontal";
import { FlipVerticalIcon as PhFlipVerticalIcon } from "@phosphor-icons/react/dist/csr/FlipVertical";
import { MonitorIcon } from "@phosphor-icons/react/dist/csr/Monitor";
import { MoonIcon as PhMoonIcon } from "@phosphor-icons/react/dist/csr/Moon";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/csr/SlidersHorizontal";
import { GearSixIcon } from "@phosphor-icons/react/dist/csr/GearSix";
import { SpeakerSimpleHighIcon } from "@phosphor-icons/react/dist/csr/SpeakerSimpleHigh";
import { SpeakerSimpleSlashIcon } from "@phosphor-icons/react/dist/csr/SpeakerSimpleSlash";
import { SparkleIcon } from "@phosphor-icons/react/dist/csr/Sparkle";
import { SunIcon as PhSunIcon } from "@phosphor-icons/react/dist/csr/Sun";
import { SunDimIcon } from "@phosphor-icons/react/dist/csr/SunDim";
import { SunHorizonIcon } from "@phosphor-icons/react/dist/csr/SunHorizon";
import { ThermometerIcon } from "@phosphor-icons/react/dist/csr/Thermometer";
import { VignetteIcon as PhVignetteIcon } from "@phosphor-icons/react/dist/csr/Vignette";
import { WavesIcon } from "@phosphor-icons/react/dist/csr/Waves";
import { XIcon as PhXIcon } from "@phosphor-icons/react/dist/csr/X";
import { IconContext } from "@phosphor-icons/react/dist/lib/context";
import type { ReactNode } from "react";
import type { AdjustmentKey } from "@/app/lib/editor/types";

/** One place to change weight or default size for every icon in the app. */
export function IconProvider({ children }: { children: ReactNode }) {
  return (
    <IconContext.Provider value={{ weight: "duotone", size: 20 }}>
      {children}
    </IconContext.Provider>
  );
}

// Editor chrome
export const UndoIcon = ArrowUUpLeftIcon;
export const RedoIcon = ArrowUUpRightIcon;
export const CloseIcon = PhXIcon;
/** Plural arrows: resets everything, vs. the single-arrow per-tool reset. */
export const ResetAllIcon = ArrowsCounterClockwiseIcon;

// Mode switcher
export const AdjustModeIcon = SlidersHorizontalIcon;
export const CropModeIcon = PhCropIcon;

// Theme toggle
export const ThemeLightIcon = PhSunIcon;
export const ThemeDarkIcon = PhMoonIcon;
export const ThemeSystemIcon = MonitorIcon;

// Settings
export const SettingsIcon = GearSixIcon;

// Sound effects
export const SoundOnIcon = SpeakerSimpleHighIcon;
export const SoundOffIcon = SpeakerSimpleSlashIcon;

// Crop tools
export const RotateIcon = ArrowClockwiseIcon;
export const FlipHorizontalIcon = PhFlipHorizontalIcon;
export const FlipVerticalIcon = PhFlipVerticalIcon;
export const ResetCropIcon = ArrowCounterClockwiseIcon;

/** Dial icons, one per adjustment. */
export const ADJUSTMENT_ICONS: Record<AdjustmentKey, typeof PhSunIcon> = {
  exposure: PhSunIcon,
  brilliance: SparkleIcon,
  highlights: SunHorizonIcon,
  shadows: PhMoonIcon,
  contrast: CircleHalfIcon,
  brightness: SunDimIcon,
  blackPoint: CircleIcon,
  saturation: DropIcon,
  vibrancy: DropHalfIcon,
  warmth: ThermometerIcon,
  tint: EyedropperIcon,
  sharpness: DiamondIcon,
  definition: ApertureIcon,
  noiseReduction: WavesIcon,
  vignette: PhVignetteIcon,
};
