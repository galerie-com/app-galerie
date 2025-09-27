import { useConnectWallet, useCurrentAccount, useWallets } from '@mysten/dapp-kit';
import { isEnokiWallet, type EnokiWallet, type AuthProvider } from '@mysten/enoki';
import Home from './Home';
import backgroundImage from '../assets/bg.svg';
import googleLogo from '../assets/google.png';

const Login = () => {
  const currentAccount = useCurrentAccount();
	const { mutate: connect } = useConnectWallet();
 
	const wallets = useWallets().filter(isEnokiWallet);
	const walletsByProvider = wallets.reduce(
		(map, wallet) => map.set(wallet.provider, wallet),
		new Map<AuthProvider, EnokiWallet>(),
	);
 
	const googleWallet = walletsByProvider.get('google');
 
	if (currentAccount) {
		return <Home />;
	}
 
	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				backgroundImage: `url(${backgroundImage})`,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
				backgroundRepeat: 'no-repeat',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '24px',
				boxSizing: 'border-box',
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: '28px',
					padding: '48px 64px',
					borderRadius: '28px',
					backgroundColor: 'rgba(255, 255, 255, 0.88)',
					backdropFilter: 'blur(10px)',
					boxShadow: '0 24px 45px rgba(0, 0, 0, 0.25)',
					textAlign: 'center',
				}}
			>
				<h1
					style={{
						margin: 0,
						fontSize: '34px',
						fontWeight: 600,
						color: '#1a1a1a',
					}}
				>
					Welcome to Galerie
				</h1>
				{googleWallet ? (
					<button
						type="button"
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '14px',
							borderRadius: '9999px',
							padding: '12px 28px',
							backgroundColor: '#fff',
							color: '#3c4043',
							border: '1px solid #dadce0',
							boxShadow: '0 1px 3px rgba(60, 64, 67, 0.3), 0 1px 1px rgba(60, 64, 67, 0.15)',
							fontSize: '16px',
							fontWeight: 500,
							cursor: 'pointer',
						}}
						onClick={() => {
							connect({ wallet: googleWallet });
						}}
					>
						<span
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
								width: '24px',
								height: '24px',
							}}
						>
							<img src={googleLogo} alt="Google" style={{ width: '18px', height: '18px' }} />
						</span>
						<span>Sign in with Google</span>
					</button>
				) : null}
			</div>
		</div>
	);
}

export default Login
