// frontend/src/config/supportedChains.js
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
    nativeTokenName: 'Polygon',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://polygonscan.com',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'polygon-pos',
    coinMarketCapId: '3890'
  },
  // Binance Smart Chain
  56: {
    chainId: 56,
    name: 'Binance Smart Chain',
    shortName: 'bsc',
    nativeTokenSymbol: 'BNB',
    nativeTokenName: 'Binance Coin',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://bscscan.com',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'binance-smart-chain',
    coinMarketCapId: '1839'
  },
  // Avalanche
  43114: {
    chainId: 43114,
    name: 'Avalanche',
    shortName: 'avalanche',
    nativeTokenSymbol: 'AVAX',
    nativeTokenName: 'Avalanche',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://snowtrace.io',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'avalanche',
    coinMarketCapId: '5805'
  },
  // Fantom
  250: {
    chainId: 250,
    name: 'Fantom',
    shortName: 'fantom',
    nativeTokenSymbol: 'FTM',
    nativeTokenName: 'Fantom',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://ftmscan.com',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'fantom',
    coinMarketCapId: '3513'
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
    coinGeckoId: 'arbitrum',
    coinMarketCapId: '12503'
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
    coinGeckoId: 'optimism',
    coinMarketCapId: '11849'
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
    coinGeckoId: 'base',
    coinMarketCapId: '20947'
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
    coinGeckoId: 'blast',
    coinMarketCapId: '24169'
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
    coinGeckoId: 'scroll',
    coinMarketCapId: '23358'
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
    coinGeckoId: 'linea',
    coinMarketCapId: '26455'
  },
  // zkSync Era
  324: {
    chainId: 324,
    name: 'zkSync Era',
    shortName: 'zksync',
    nativeTokenSymbol: 'ETH',
    nativeTokenName: 'Ether',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://era.zksync.network',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'zksync',
    coinMarketCapId: '18969'
  },
  // Moonbeam
  1284: {
    chainId: 1284,
    name: 'Moonbeam',
    shortName: 'moonbeam',
    nativeTokenSymbol: 'GLMR',
    nativeTokenName: 'Moonbeam',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://moonscan.io',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'moonbeam',
    coinMarketCapId: '16271'
  },
  // Moonriver
  1285: {
    chainId: 1285,
    name: 'Moonriver',
    shortName: 'moonriver',
    nativeTokenSymbol: 'MOVR',
    nativeTokenName: 'Moonriver',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://moonriver.moonscan.io',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'moonriver',
    coinMarketCapId: '16272'
  },
  // Gnosis Chain (formerly xDai)
  100: {
    chainId: 100,
    name: 'Gnosis Chain',
    shortName: 'gnosis',
    nativeTokenSymbol: 'xDAI',
    nativeTokenName: 'xDai',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://gnosisscan.io',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'xdai',
    coinMarketCapId: '10237'
  },
  // Harmony One
  1666600000: {
    chainId: 1666600000,
    name: 'Harmony One',
    shortName: 'harmony',
    nativeTokenSymbol: 'ONE',
    nativeTokenName: 'Harmony',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://explorer.harmony.one',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'harmony',
    coinMarketCapId: '3930'
  },
  // Cronos
  25: {
    chainId: 25,
    name: 'Cronos',
    shortName: 'cronos',
    nativeTokenSymbol: 'CRO',
    nativeTokenName: 'Cronos',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://cronoscan.com',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'cronos',
    coinMarketCapId: '3635'
  },
  // Celo
  42220: {
    chainId: 42220,
    name: 'Celo',
    shortName: 'celo',
    nativeTokenSymbol: 'CELO',
    nativeTokenName: 'Celo',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://celoscan.io',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'celo',
    coinMarketCapId: '5567'
  },
  // Aurora
  1313161554: {
    chainId: 1313161554,
    name: 'Aurora',
    shortName: 'aurora',
    nativeTokenSymbol: 'ETH',
    nativeTokenName: 'Ether',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://aurorascan.dev',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'aurora',
    coinMarketCapId: '15585'
  },
  // Boba Network
  288: {
    chainId: 288,
    name: 'Boba Network',
    shortName: 'boba',
    nativeTokenSymbol: 'ETH',
    nativeTokenName: 'Ether',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://bobascan.com',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'boba',
    coinMarketCapId: '14674'
  },
  // Metis
  1088: {
    chainId: 1088,
    name: 'Metis',
    shortName: 'metis',
    nativeTokenSymbol: 'METIS',
    nativeTokenName: 'Metis',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://explorer.metis.io',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'metis',
    coinMarketCapId: '16025'
  },
  // Kava
  2222: {
    chainId: 2222,
    name: 'Kava',
    shortName: 'kava',
    nativeTokenSymbol: 'KAVA',
    nativeTokenName: 'Kava',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://kavascan.com',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'kava',
    coinMarketCapId: '10442'
  },
  // Shiden
  336: {
    chainId: 336,
    name: 'Shiden',
    shortName: 'shiden',
    nativeTokenSymbol: 'SDN',
    nativeTokenName: 'Shiden',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://shiden.subscan.io',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'shiden',
    coinMarketCapId: '12354'
  },
  // Zora
  7777777: {
    chainId: 7777777,
    name: 'Zora',
    shortName: 'zora',
    nativeTokenSymbol: 'ETH',
    nativeTokenName: 'Ether',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://zora.superscan.network',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'zora',
    coinMarketCapId: '26804'
  },
  // Ethereum Sepolia
  11155111: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    shortName: 'sepolia',
    nativeTokenSymbol: 'ETH',
    nativeTokenName: 'Ether',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://sepolia.etherscan.io',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'ethereum',
    coinMarketCapId: '1027'
  },
  // Polygon Mumbai
  80001: {
    chainId: 80001,
    name: 'Polygon Mumbai',
    shortName: 'mumbai',
    nativeTokenSymbol: 'MATIC',
    nativeTokenName: 'Polygon',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://mumbai.polygonscan.com',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'polygon',
    coinMarketCapId: '3890'
  },
  // BSC Testnet
  97: {
    chainId: 97,
    name: 'BSC Testnet',
    shortName: 'bsctest',
    nativeTokenSymbol: 'BNB',
    nativeTokenName: 'Binance Coin',
    nativeTokenAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://testnet.bscscan.com',
    apiUrl: 'https://api.etherscan.io/v2/api',
    coinGeckoId: 'binance-smart-chain',
    coinMarketCapId: '1839'
  }
};

export default SUPPORTED_CHAINS;