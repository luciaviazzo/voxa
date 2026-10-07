import React from 'react';
import { render, screen } from '@testing-library/react-native';
import RootLayout from '../app/_layout';
import NotFoundScreen from '../app/+not-found';

const mockStack = jest.fn(({ children }: { children?: React.ReactNode }) => <>{children}</>);
const mockStackScreen = jest.fn((_props: { name: string }) => null);
const mockLink = jest.fn(({ children }: { children?: React.ReactNode }) => <>{children}</>);
const mockStatusBar = jest.fn((_props: { style: string }) => null);

jest.mock('expo-router', () => {
  const Stack = (props: any) => mockStack(props);
  Stack.Screen = (props: any) => mockStackScreen(props);
  return { Stack, Link: (props: any) => mockLink(props) };
});
jest.mock('expo-status-bar', () => ({ StatusBar: (props: any) => mockStatusBar(props) }));

describe('RootLayout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('oculta el encabezado en todas las pantallas', () => {
    render(<RootLayout />);

    expect(mockStack.mock.calls[0][0]).toMatchObject({ screenOptions: { headerShown: false } });
  });

  it('registra las pantallas index y +not-found', () => {
    render(<RootLayout />);

    const names = mockStackScreen.mock.calls.map(([props]) => props.name);
    expect(names).toEqual(['index', '+not-found']);
  });

  it('usa la barra de estado oscura', () => {
    render(<RootLayout />);

    expect(mockStatusBar.mock.calls[0][0]).toMatchObject({ style: 'dark' });
  });
});

describe('NotFoundScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('explica que la pantalla no existe', () => {
    render(<NotFoundScreen />);

    expect(screen.getByText('Oops! Pantalla no encontrada')).toBeTruthy();
    expect(screen.getByText('La sección a la que intentás ingresar no está disponible.')).toBeTruthy();
  });

  it('ofrece volver al inicio', () => {
    render(<NotFoundScreen />);

    expect(screen.getByText('Volver al Inicio')).toBeTruthy();
    expect(mockLink.mock.calls[0][0]).toMatchObject({ href: '/' });
  });
});
