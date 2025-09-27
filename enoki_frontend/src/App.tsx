import {
	createNetworkConfig,
	SuiClientProvider,
	// useSuiClientContext,
	WalletProvider,
} from '@mysten/dapp-kit';
import './App.css'
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RegisterEnokiWallets from './components/RegisterEnokiWallets';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Market from './pages/Market';
import FAQ from './pages/FAQ';
import Portfolio from './pages/Portfolio';
import Support from './pages/Support';

const {networkConfig} = createNetworkConfig({
  testnet: {url: getFullnodeUrl('testnet')},
  mainnet: {url: getFullnodeUrl('mainnet')},
});

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
		<SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
			<RegisterEnokiWallets />
			<WalletProvider autoConnect>
				<BrowserRouter>
				  <Routes>
				    <Route path="/" element={<Login />} />
				    <Route path="/home" element={<Home />} />
				    <Route path="/market" element={<Market />} />
				    <Route path="/portfolio" element={<Portfolio />} />
				    <Route path="/faq" element={<FAQ />} />
				    <Route path="/support" element={<Support />} />
				  </Routes>
				</BrowserRouter>
			</WalletProvider>
		</SuiClientProvider>
  </QueryClientProvider>
	);
}

export default App
