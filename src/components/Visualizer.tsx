import React, { useMemo } from 'react';
import AnimatedCanvas from './AnimatedCanvas';
import { calculateAmplitude } from '../utils';
import FastNoise from "fastnoise-lite";

export default function Visualizer(props: { themeColor: string, audioAnalysis: SpotifyAudioAnalysis }) {
    const fastNoise = useMemo(() => {
        const instance = new FastNoise(props.audioAnalysis.meta.timestamp);

        instance.SetNoiseType(FastNoise.NoiseType.Perlin);
        instance.SetFractalType(FastNoise.FractalType.FBm);
        instance.SetFractalOctaves(3);
        instance.SetFractalLacunarity(1.5);
        instance.SetFractalGain(0.5);

        return instance;
    }, [props.audioAnalysis]);

    return <AnimatedCanvas data={{ ...props, fastNoise }}
        draw={(ctx, data, _) => {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            const maxRadius = Math.min(ctx.canvas.width, ctx.canvas.height) / 2 * 0.9;
            const minRadius = maxRadius * 0.75;

            const dotCountXY = 100;
            const dotRadius = maxRadius / dotCountXY;
            const dotFieldSize = maxRadius;
            const dotFieldPosX = (ctx.canvas.width - dotFieldSize) / 2;
            const dotFieldPosY = (ctx.canvas.height - dotFieldSize) / 2;
            const dotStepSize = dotFieldSize / (dotCountXY - 1);

            const currentProgress = Spicetify.Player.getProgress() / 1000;

            const amplitude = calculateAmplitude(data.audioAnalysis, currentProgress);
            const sphereRadius = minRadius + (maxRadius - minRadius) * amplitude;
            const spherePosX = ctx.canvas.width / 2;
            const spherePosY = ctx.canvas.height / 2;
            const feather = Math.pow((100 * amplitude + 300) / 28, 2) / 400 * maxRadius;
            const featherRadius = sphereRadius - feather;

            const fractalScale = 4;
            const fractalSpeed = 75;
            const fractalDisplacement = maxRadius * 0.2;

            ctx.fillStyle = data.themeColor;
            ctx.beginPath();

            for (let x = 0; x < dotCountXY; x++)
                for (let y = 0; y < dotCountXY; y++) {
                    const fractal = data.fastNoise.GetNoise(
                        x * fractalScale,
                        y * fractalScale,
                        currentProgress * fractalSpeed) * fractalDisplacement;

                    let vx = x * dotStepSize + dotFieldPosX - spherePosX + fractal;
                    let vy = y * dotStepSize + dotFieldPosY - spherePosY + fractal;
                    let vz = (fractal + fractalDisplacement * 0.5) * amplitude;

                    const distanceFromSphere = Math.sqrt(vx * vx + vy * vy + vz * vz);
                    if(distanceFromSphere > sphereRadius) continue;

                    let strength = (distanceFromSphere - featherRadius) / feather;
                    strength = Math.max(0, Math.min(strength, 1));
                    strength = 1 - strength;

                    const factor = strength * (sphereRadius / distanceFromSphere - 1) + 1;
                    vx *= factor;
                    vy *= factor;

                    vx += spherePosX;
                    vy += spherePosY;

                    ctx.moveTo(vx + dotRadius, vy);
                    ctx.arc(vx, vy, dotRadius, 0, 2 * Math.PI);
                }

            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 15;
            ctx.shadowColor = data.themeColor;
            ctx.fill();
        }}
        style={{ "width": "100%", "height": "100%", "objectFit": "contain" }}
        onResize={(canvas) => {
            const size = Math.min(canvas.clientWidth, canvas.clientHeight);
            canvas.width = size;
            canvas.height = size;
        }} />
}