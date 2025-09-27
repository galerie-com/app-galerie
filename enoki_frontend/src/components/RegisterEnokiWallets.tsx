import { useEffect } from "react"; 
import { useSuiClientContext } from "@mysten/dapp-kit";
import { isEnokiNetwork, registerEnokiWallets } from "@mysten/enoki";
export default function RegisterEnokiWallets() {
	const { client, network } = useSuiClientContext();
 
	useEffect(() => {
		if (!isEnokiNetwork(network)) return;
 
		const googleRedirectUri =
			import.meta.env.VITE_GOOGLE_REDIRECT_URI ?? `${window.location.origin}/`;

		const { unregister } = registerEnokiWallets({
			apiKey: import.meta.env.VITE_ENOKI_API_KEY,
			providers: {
				google: {
					clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
					redirectUri: googleRedirectUri,
				},
				twitch: {
					clientId: 'YOUR_TWITCH_CLIENT_ID',
				},
			},
			client,
			network,
		});
 
		return unregister;
	}, [client, network]);
 
	return null;
}