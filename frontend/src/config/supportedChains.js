export const SUPPORTED_CHAINS = {
  // Ethereum Mainnet
  1: {
    chainId: 1,
    name: 'Ethereum',
    shortName: 'eth',
    nativeTokenSymbol: 'ETH',
    nativeTokenName: 'Ether',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://etherscan.io',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'ethereum',
    coinMarketCapId: '1027'
  },
  // Polygon (Matic)
  137: {
    chainId: 137,
    name: 'Polygon',
    shortName: 'polygon',
    nativeTokenSymbol: 'MATIC',
    nativeTokenName: 'Polygon Ecosystem Token',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://polygonscan.com',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'matic-network',
    coinMarketCapId: '3890'
  },
  // Binance Smart Chain
  56: {
    chainId: 56,
    name: 'Binance Smart Chain',
    shortName: 'bsc',
    nativeTokenSymbol: 'BNB',
    nativeTokenName: 'BNB',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://bscscan.com',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'binancecoin',
    coinMarketCapId: '1839'
  },
  // Optimism
  10: {
    chainId: 10,
    name: 'Optimism',
    shortName: 'optimism',
    nativeTokenSymbol: 'ETH',
    nativeTokenName: 'Ether',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://optimistic.etherscan.io',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'ethereum',
    coinMarketCapId: '1027'
  },
  // Arbitrum One
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    shortName: 'arbitrum',
    nativeTokenSymbol: 'ETH',
    nativeTokenName: 'Ether',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://arbiscan.io',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'ethereum',
    coinMarketCapId: '1027'
  },
  // Avalanche C-Chain
  43114: {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    shortName: 'avalanche',
    nativeTokenSymbol: 'AVAX',
    nativeTokenName: 'Avalanche',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://snowtrace.io',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'avalanche-2',
    coinMarketCapId: '5805'
  },
  // Base
  8453: {
    chainId: 8453,
    name: 'Base',
    shortName: 'base',
    nativeTokenSymbol: 'ETH',
    nativeTokenName: 'Ether',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://basescan.org',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'ethereum',
    coinMarketCapId: '1027'
  },
  // Gnosis Chain (xDai)
  100: {
    chainId: 100,
    name: 'Gnosis Chain',
    shortName: 'gnosis',
    nativeTokenSymbol: 'xDAI',
    nativeTokenName: 'xDAI',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://gnosisscan.io',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'xdai',
    coinMarketCapId: '5113'
  },
  // Scroll
  534352: {
    chainId: 534352,
    name: 'Scroll',
    shortName: 'scroll',
    nativeTokenSymbol: 'ETH',
    nativeTokenName: 'Ether',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://scrollscan.com',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'ethereum',
    coinMarketCapId: '1027'
  },
  // zkSync Era
  324: {
    chainId: 324,
    name: 'zkSync Era',
    shortName: 'zksync',
    nativeTokenSymbol: 'ETH',
    nativeTokenName: 'Ether',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://explorer.zksync.io',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'ethereum',
    coinMarketCapId: '1027'
  },
  // Linea
  59144: {
    chainId: 59144,
    name: 'Linea',
    shortName: 'linea',
    nativeTokenSymbol: 'ETH',
    nativeTokenName: 'Ether',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://lineascan.build',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'ethereum',
    coinMarketCapId: '1027'
  },
  // Blast
  81457: {
    chainId: 81457,
    name: 'Blast',
    shortName: 'blast',
    nativeTokenSymbol: 'ETH',
    nativeTokenName: 'Ether',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://blastscan.io',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'ethereum',
    coinMarketCapId: '1027'
  }
};

// Функция для получения конфигурации сети по chainId
export const getNetworkConfig = (chainId) => {
  return SUPPORTED_CHAINS[chainId];
};

// Функция для получения всех поддерживаемых chainId
export const getSupportedChainIds = () => {
  return Object.keys(SUPPORTED_CHAINS).map(Number);
};

export default SUPPORTED_CHAINS;