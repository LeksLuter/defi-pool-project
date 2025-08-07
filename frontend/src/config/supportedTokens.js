// Список поддерживаемых токенов с метаданными, включая CoinGecko ID
const SUPPORTED_TOKENS = {
  // Ethereum Mainnet
  1: {
    // Native Token
    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE': {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      coingeckoId: 'ethereum',
      cmcId: '1027'
    },
    // Пример токенов ERC-20
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      coingeckoId: 'usd-coin',
      cmcId: '3408'
    },
    '0xdAC17F958D2ee523a2206206994597C13D831ec7': {
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
      coingeckoId: 'tether',
      cmcId: '825'
    },
    '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': {
      name: 'Wrapped Bitcoin',
      symbol: 'WBTC',
      decimals: 8,
      coingeckoId: 'wrapped-bitcoin',
      cmcId: '3717'
    }
  },
  // Polygon Mainnet
  137: {
    // Native Token
    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE': {
      name: 'Matic Token',
      symbol: 'MATIC',
      decimals: 18,
      coingeckoId: 'matic-network',
      cmcId: '3890'
    },
    // Пример токенов на Polygon
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174': {
      name: 'USD Coin (PoS)',
      symbol: 'USDC',
      decimals: 6,
      coingeckoId: 'usd-coin',
      cmcId: '3408'
    },
    '0xc2132D05D31c914a87C6611C10748AEb04B58e8F': {
      name: 'Tether USD (PoS)',
      symbol: 'USDT',
      decimals: 6,
      coingeckoId: 'tether',
      cmcId: '825'
    }
  }
  // Можно добавить поддержку других сетей
};

export default SUPPORTED_TOKENS;