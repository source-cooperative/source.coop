'use client';

import { useState } from 'react';
import { Tabs, Box, Flex, Text } from '@radix-ui/themes';
import { LoginForm } from './LoginForm';
import { RegistrationForm } from './RegistrationForm';

interface AuthTabsProps {
  defaultTab: string;
}

export function AuthTabs({ defaultTab }: AuthTabsProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  
  return (
    <Box className="mx-auto max-w-md">
      <Flex mb="5" justify="center">
        <Text size="6" weight="bold">Welcome</Text>
      </Flex>
      
      <Tabs.Root 
        defaultValue={defaultTab} 
        onValueChange={(value) => setActiveTab(value)}
      >
        <Tabs.List>
          <Tabs.Trigger value="login">Login</Tabs.Trigger>
          <Tabs.Trigger value="register">Register</Tabs.Trigger>
        </Tabs.List>
        
        <Box pt="4">
          <Tabs.Content value="login">
            {activeTab === 'login' && <LoginForm />}
          </Tabs.Content>
          
          <Tabs.Content value="register">
            {activeTab === 'register' && <RegistrationForm />}
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </Box>
  );
} 