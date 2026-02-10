import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import SaleScreen from './src/screens/SaleScreen';
import InvoicesScreen from './src/screens/InvoicesScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap = 'home';
            if (route.name === 'Accueil') iconName = focused ? 'home' : 'home-outline';
            else if (route.name === 'Produits') iconName = focused ? 'cube' : 'cube-outline';
            else if (route.name === 'Vente') iconName = focused ? 'cart' : 'cart-outline';
            else if (route.name === 'Factures') iconName = focused ? 'receipt' : 'receipt-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#4A90D9',
          tabBarInactiveTintColor: '#999',
          headerStyle: { backgroundColor: '#4A90D9' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          tabBarStyle: {
            paddingBottom: 6,
            paddingTop: 6,
            height: 60,
          },
        })}
      >
        <Tab.Screen name="Accueil" component={HomeScreen} />
        <Tab.Screen name="Produits" component={ProductsScreen} />
        <Tab.Screen name="Vente" component={SaleScreen} />
        <Tab.Screen name="Factures" component={InvoicesScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
