jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { FontAwesome: () => <Text /> };
});

require('@testing-library/react-native').configure({ asyncUtilTimeout: 5000 });
