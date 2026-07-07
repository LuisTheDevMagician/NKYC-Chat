"use client";

import { useMemo } from "react";
import {
  Particles,
  ParticlesProvider,
  useParticlesProvider,
  type ParticlesPluginRegistrar,
} from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

const initEngine: ParticlesPluginRegistrar = async (engine) => {
  await loadSlim(engine);
};

function ParticleNetwork() {
  const { loaded } = useParticlesProvider();

  const options: ISourceOptions = useMemo(
    () => ({
      fullScreen: { enable: false },
      background: { color: "transparent" },
      fpsLimit: 60,
      particles: {
        number: { value: 140, density: { enable: true, area: 800 } },
        color: { value: "#F7931A" },
        opacity: {
          value: { min: 0.4, max: 0.9 },
          animation: { enable: true, speed: 1.2, sync: false },
        },
        size: { value: { min: 2, max: 4 } },
        links: {
          enable: true,
          color: "#F7931A",
          opacity: 0.5,
          distance: 160,
          width: 1.5,
          shadow: { enable: true, color: "#F7931A", blur: 6 },
        },
        move: { enable: true, speed: 0.5, outModes: { default: "out" } },
      },
      detectRetina: true,
    }),
    []
  );

  if (!loaded) return null;

  return (
    <Particles
      id="nkyc-particle-network"
      className="pointer-events-none fixed inset-0 -z-10"
      options={options}
    />
  );
}

export function ParticleBackground() {
  return (
    <ParticlesProvider init={initEngine}>
      <ParticleNetwork />
    </ParticlesProvider>
  );
}
