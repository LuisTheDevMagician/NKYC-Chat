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
        number: { value: 60, density: { enable: true, area: 900 } },
        color: { value: "#F7931A" },
        opacity: { value: 0.35 },
        size: { value: { min: 1, max: 2 } },
        links: {
          enable: true,
          color: "#F7931A",
          opacity: 0.15,
          distance: 140,
        },
        move: { enable: true, speed: 0.4, outModes: { default: "out" } },
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
