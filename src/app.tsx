import React, { useEffect, useState } from "react";
import styles from "./css/app.module.scss";
import LoadingIcon from "./components/LoadingIcon";
import Visualizer from "./components/Visualizer";
import { DEFAULT_THEME_COLOR } from "./resources";

enum VisualizerState {
	LOADING,
	RUNNING,
	ERROR_NOT_PLAYING,
	ERROR_UNSUPPORTED_TRACK_TYPE,
	ERROR_NO_NETWORK
}

export default function App() {
	const [state, setState] = useState<VisualizerState>(VisualizerState.LOADING);
	const [trackData, setTrackData] = useState<{ audioAnalysis?: SpotifyAudioAnalysis; themeColor?: string }>({});

	useEffect(() => {
		const updatePlayerState = async (newState: Spicetify.PlayerState) => {
			const item = newState?.item ?? newState?.track;

			if (!item) {
				setState(VisualizerState.ERROR_NOT_PLAYING);
				return;
			}

			const uri = item.uri;
			if (!Spicetify.URI.isTrack(uri)) {
				setState(VisualizerState.ERROR_UNSUPPORTED_TRACK_TYPE);
				return;
			}

			setState(VisualizerState.LOADING);

			const [audioAnalysis, vibrantColor] = await Promise.all([
				Spicetify.getAudioData(uri).catch(() => undefined) as Promise<SpotifyAudioAnalysis | undefined>,
				Spicetify.colorExtractor(uri)
					.then(colors => colors.VIBRANT)
					.catch(() => undefined)
			]);

			if (!audioAnalysis) {
				setState(VisualizerState.ERROR_NO_NETWORK);
				return;
			}

			setTrackData({ audioAnalysis, themeColor: vibrantColor });
			setState(VisualizerState.RUNNING);
		};

		const songChangeListener = (event?: Event & { data: Spicetify.PlayerState }) => {
			if (event?.data) updatePlayerState(event.data);
		};

		Spicetify.Player.addEventListener("songchange", songChangeListener);
		updatePlayerState(Spicetify.Player.data);

		return () => Spicetify.Player.removeEventListener("songchange", songChangeListener as PlayerEventListener);
	}, []);

	return (
		<div className={styles.container}>
			{state == VisualizerState.LOADING ? (
				<LoadingIcon />
			) : state == VisualizerState.ERROR_NOT_PLAYING ? (
				<div className={styles.unavailable_message}>{"Start playing a song to see the visualization!"}</div>
			) : state == VisualizerState.ERROR_UNSUPPORTED_TRACK_TYPE ? (
				<div className={styles.unavailable_message}>{"Error: The type of track you're listening to is currently not supported"}</div>
			) : state == VisualizerState.ERROR_NO_NETWORK ? (
				<div className={styles.unavailable_message}>
					{"Error: The audio analysis could not be loaded, please check your internet connection"}
				</div>
			) : null}

			<Visualizer
				isEnabled={state == VisualizerState.RUNNING}
				audioAnalysis={trackData.audioAnalysis}
				themeColor={trackData.themeColor ?? DEFAULT_THEME_COLOR}
			/>
		</div>
	);
}
