import {
  fetchAccount,
  fetchAccountByEmail,
  fetchAccountsByType,
  updateAccount,
  fetchRepository,
  fetchRepositoriesByAccount,
  fetchRepositories,
  fetchPublicRepositories,
  updateRepository,
  updateRepositoryRole,
  updateRepositoryMirror,
  fetchOrganizationMembers,
  isIndividualAccount,
  isOrganizationalAccount
} from './operations_v2';

import type { Account, IndividualAccount, OrganizationalAccount } from '@/types/account_v2';
import type { Repository_v2, RepositoryMirror, RepositoryRole } from '@/types/repository_v2';

// Mock the DynamoDB client
jest.mock('@/lib/clients', () => ({
  getDynamoDb: jest.fn().mockReturnValue({
    send: jest.fn()
  })
}));

// Import the mocked client
import { getDynamoDb } from '@/lib/clients';

describe('Database Operations v2', () => {
  let mockDocClient: any;
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockDocClient = getDynamoDb();
  });

  describe('Account Operations', () => {
    it('fetchAccount should return an account when found', async () => {
      const mockAccount: IndividualAccount = {
        account_id: 'acc123',
        type: 'individual',
        name: 'Test User',
        emails: [{
          address: 'test@example.com',
          verified: false,
          is_primary: true,
          added_at: new Date().toISOString()
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        disabled: false,
        flags: [],
        metadata_public: {},
        metadata_private: {
          identity_id: 'id123'
        }
      };

      mockDocClient.send.mockResolvedValueOnce({ Item: mockAccount });

      const result = await fetchAccount('acc123');
      
      expect(result).toEqual(mockAccount);
      expect(mockDocClient.send).toHaveBeenCalledTimes(1);
    });

    it('fetchAccount should return null when not found', async () => {
      mockDocClient.send.mockResolvedValueOnce({ Item: null });
      mockDocClient.send.mockResolvedValueOnce({ Item: null });

      const result = await fetchAccount('nonexistent');
      
      expect(result).toBeNull();
      expect(mockDocClient.send).toHaveBeenCalledTimes(2);
    });

    it('fetchAccountByEmail should return an account when found', async () => {
      const mockAccount: IndividualAccount = {
        account_id: 'acc123',
        type: 'individual',
        name: 'Test User',
        emails: [{
          address: 'test@example.com',
          verified: false,
          is_primary: true,
          added_at: new Date().toISOString()
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        disabled: false,
        flags: [],
        metadata_public: {},
        metadata_private: {
          identity_id: 'id123'
        }
      };

      mockDocClient.send.mockResolvedValueOnce({ Items: [mockAccount] });

      const result = await fetchAccountByEmail('test@example.com');
      
      expect(result).toEqual(mockAccount);
      expect(mockDocClient.send).toHaveBeenCalledTimes(1);
    });

    it('fetchAccountsByType should return accounts of the specified type', async () => {
      const mockAccounts: IndividualAccount[] = [
        {
          account_id: 'acc123',
          type: 'individual',
          name: 'Test User 1',
          emails: [{
            address: 'test1@example.com',
            verified: false,
            is_primary: true,
            added_at: new Date().toISOString()
          }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          disabled: false,
          flags: [],
          metadata_public: {},
          metadata_private: {
            identity_id: 'id123'
          }
        },
        {
          account_id: 'acc456',
          type: 'individual',
          name: 'Test User 2',
          emails: [{
            address: 'test2@example.com',
            verified: false,
            is_primary: true,
            added_at: new Date().toISOString()
          }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          disabled: false,
          flags: [],
          metadata_public: {},
          metadata_private: {
            identity_id: 'id456'
          }
        }
      ];

      mockDocClient.send.mockResolvedValueOnce({ Items: mockAccounts });

      const result = await fetchAccountsByType('individual');
      
      expect(result).toEqual(mockAccounts);
      expect(mockDocClient.send).toHaveBeenCalledTimes(1);
    });

    it('updateAccount should return true when successful', async () => {
      mockDocClient.send.mockResolvedValueOnce({});

      const mockAccount: IndividualAccount = {
        account_id: 'acc123',
        type: 'individual',
        name: 'Test User',
        emails: [{
          address: 'test@example.com',
          verified: false,
          is_primary: true,
          added_at: new Date().toISOString()
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        disabled: false,
        flags: [],
        metadata_public: {},
        metadata_private: {
          identity_id: 'id123'
        }
      };

      const result = await updateAccount(mockAccount);
      
      expect(result).toBe(true);
      expect(mockDocClient.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('Repository Operations', () => {
    it('fetchRepository should return a repository when found', async () => {
      const mockRepo: Repository_v2 = {
        repository_id: 'repo123',
        account_id: 'acc123',
        title: 'Test Repository',
        description: 'A test repository',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        visibility: 'public',
        metadata: {
          mirrors: {},
          primary_mirror: 'default',
          roles: {}
        }
      };

      mockDocClient.send.mockResolvedValueOnce({ Item: mockRepo });

      const result = await fetchRepository('acc123', 'repo123');
      
      expect(result).toEqual(mockRepo);
      expect(mockDocClient.send).toHaveBeenCalledTimes(1);
    });

    it('fetchRepositoriesByAccount should return repositories for an account', async () => {
      const mockRepos: Repository_v2[] = [
        {
          repository_id: 'repo123',
          account_id: 'acc123',
          title: 'Test Repository 1',
          description: 'A test repository',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          visibility: 'public',
          metadata: {
            mirrors: {},
            primary_mirror: 'default',
            roles: {}
          }
        },
        {
          repository_id: 'repo456',
          account_id: 'acc123',
          title: 'Test Repository 2',
          description: 'Another test repository',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          visibility: 'public',
          metadata: {
            mirrors: {},
            primary_mirror: 'default',
            roles: {}
          }
        }
      ];

      mockDocClient.send.mockResolvedValueOnce({ Items: mockRepos });

      const result = await fetchRepositoriesByAccount('acc123');
      
      expect(result).toEqual(mockRepos);
      expect(mockDocClient.send).toHaveBeenCalledTimes(1);
    });

    it('fetchPublicRepositories should return public repositories', async () => {
      const mockRepos: Repository_v2[] = [
        {
          repository_id: 'repo123',
          account_id: 'acc123',
          title: 'Public Repository 1',
          description: 'A public repository',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          visibility: 'public',
          metadata: {
            mirrors: {},
            primary_mirror: 'default',
            roles: {}
          }
        },
        {
          repository_id: 'repo456',
          account_id: 'acc456',
          title: 'Public Repository 2',
          description: 'Another public repository',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          visibility: 'public',
          metadata: {
            mirrors: {},
            primary_mirror: 'default',
            roles: {}
          }
        }
      ];

      mockDocClient.send.mockResolvedValueOnce({ 
        Items: mockRepos,
        LastEvaluatedKey: { visibility: 'public', created_at: mockRepos[1].created_at }
      });

      const result = await fetchPublicRepositories(2);
      
      expect(result.repositories).toEqual(mockRepos);
      expect(result.lastEvaluatedKey).toBeDefined();
      expect(mockDocClient.send).toHaveBeenCalledTimes(1);
    });

    it('updateRepository should return true when successful', async () => {
      mockDocClient.send.mockResolvedValueOnce({});

      const mockRepo: Repository_v2 = {
        repository_id: 'repo123',
        account_id: 'acc123',
        title: 'Test Repository',
        description: 'A test repository',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        visibility: 'public',
        metadata: {
          mirrors: {},
          primary_mirror: 'default',
          roles: {}
        }
      };

      const result = await updateRepository(mockRepo);
      
      expect(result).toBe(true);
      expect(mockDocClient.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('Organization Operations', () => {
    it('fetchOrganizationMembers should return owner, admins, and members', async () => {
      // Create mock organization account
      const mockOrgAccount: OrganizationalAccount = {
        account_id: 'org123',
        type: 'organization',
        name: 'Test Org',
        emails: [{
          address: 'org@example.com',
          verified: false,
          is_primary: true,
          added_at: new Date().toISOString()
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        disabled: false,
        flags: [],
        metadata_public: {
          owner_account_id: 'owner123',
          admin_account_ids: ['admin1', 'admin2'],
          member_account_ids: ['member1', 'member2', 'member3']
        },
        metadata_private: {
          identity_id: 'id123'
        }
      };

      // Create mock owner account
      const mockOwnerAccount: IndividualAccount = {
        account_id: 'owner123',
        type: 'individual',
        name: 'Owner User',
        emails: [{
          address: 'owner@example.com',
          verified: true,
          is_primary: true,
          added_at: new Date().toISOString()
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        disabled: false,
        flags: [],
        metadata_public: {},
        metadata_private: {
          identity_id: 'id_owner'
        }
      };

      // Create mock admin accounts
      const mockAdminAccounts: IndividualAccount[] = [
        {
          account_id: 'admin1',
          type: 'individual',
          name: 'Admin User 1',
          emails: [{
            address: 'admin1@example.com',
            verified: true,
            is_primary: true,
            added_at: new Date().toISOString()
          }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          disabled: false,
          flags: [],
          metadata_public: {},
          metadata_private: {
            identity_id: 'id_admin1'
          }
        },
        {
          account_id: 'admin2',
          type: 'individual',
          name: 'Admin User 2',
          emails: [{
            address: 'admin2@example.com',
            verified: true,
            is_primary: true,
            added_at: new Date().toISOString()
          }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          disabled: false,
          flags: [],
          metadata_public: {},
          metadata_private: {
            identity_id: 'id_admin2'
          }
        }
      ];

      // Create mock member accounts
      const mockMemberAccounts: IndividualAccount[] = [
        {
          account_id: 'member1',
          type: 'individual',
          name: 'Member User 1',
          emails: [{
            address: 'member1@example.com',
            verified: true,
            is_primary: true,
            added_at: new Date().toISOString()
          }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          disabled: false,
          flags: [],
          metadata_public: {},
          metadata_private: {
            identity_id: 'id_member1'
          }
        },
        {
          account_id: 'member2',
          type: 'individual',
          name: 'Member User 2',
          emails: [{
            address: 'member2@example.com',
            verified: true,
            is_primary: true,
            added_at: new Date().toISOString()
          }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          disabled: false,
          flags: [],
          metadata_public: {},
          metadata_private: {
            identity_id: 'id_member2'
          }
        },
        {
          account_id: 'member3',
          type: 'individual',
          name: 'Member User 3',
          emails: [{
            address: 'member3@example.com',
            verified: true,
            is_primary: true,
            added_at: new Date().toISOString()
          }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          disabled: false,
          flags: [],
          metadata_public: {},
          metadata_private: {
            identity_id: 'id_member3'
          }
        }
      ];

      // Mock the fetchAccount function to return the appropriate accounts
      mockDocClient.send
        .mockResolvedValueOnce({ Item: mockOwnerAccount }) // For owner
        .mockResolvedValueOnce({ Item: mockAdminAccounts[0] }) // For admin1
        .mockResolvedValueOnce({ Item: mockAdminAccounts[1] }) // For admin2
        .mockResolvedValueOnce({ Item: mockMemberAccounts[0] }) // For member1
        .mockResolvedValueOnce({ Item: mockMemberAccounts[1] }) // For member2
        .mockResolvedValueOnce({ Item: mockMemberAccounts[2] }); // For member3

      const result = await fetchOrganizationMembers(mockOrgAccount);
      
      expect(result.owner).toEqual(mockOwnerAccount);
      expect(result.admins).toEqual(mockAdminAccounts);
      expect(result.members).toEqual(mockMemberAccounts);
      expect(mockDocClient.send).toHaveBeenCalledTimes(6);
    });

    it('fetchOrganizationMembers should handle missing members', async () => {
      // Create mock organization account
      const mockOrgAccount: OrganizationalAccount = {
        account_id: 'org123',
        type: 'organization',
        name: 'Test Org',
        emails: [{
          address: 'org@example.com',
          verified: false,
          is_primary: true,
          added_at: new Date().toISOString()
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        disabled: false,
        flags: [],
        metadata_public: {
          owner_account_id: 'owner123',
          admin_account_ids: ['admin1'],
          member_account_ids: ['member1', 'nonexistent']
        },
        metadata_private: {
          identity_id: 'id123'
        }
      };

      // Create mock owner account
      const mockOwnerAccount: IndividualAccount = {
        account_id: 'owner123',
        type: 'individual',
        name: 'Owner User',
        emails: [{
          address: 'owner@example.com',
          verified: true,
          is_primary: true,
          added_at: new Date().toISOString()
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        disabled: false,
        flags: [],
        metadata_public: {},
        metadata_private: {
          identity_id: 'id_owner'
        }
      };

      // Create mock admin account
      const mockAdminAccount: IndividualAccount = {
        account_id: 'admin1',
        type: 'individual',
        name: 'Admin User 1',
        emails: [{
          address: 'admin1@example.com',
          verified: true,
          is_primary: true,
          added_at: new Date().toISOString()
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        disabled: false,
        flags: [],
        metadata_public: {},
        metadata_private: {
          identity_id: 'id_admin1'
        }
      };

      // Create mock member account
      const mockMemberAccount: IndividualAccount = {
        account_id: 'member1',
        type: 'individual',
        name: 'Member User 1',
        emails: [{
          address: 'member1@example.com',
          verified: true,
          is_primary: true,
          added_at: new Date().toISOString()
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        disabled: false,
        flags: [],
        metadata_public: {},
        metadata_private: {
          identity_id: 'id_member1'
        }
      };

      // Mock the fetchAccount function to return the appropriate accounts
      mockDocClient.send
        .mockResolvedValueOnce({ Item: mockOwnerAccount }) // For owner
        .mockResolvedValueOnce({ Item: mockAdminAccount }) // For admin1
        .mockResolvedValueOnce({ Item: mockMemberAccount }) // For member1
        .mockResolvedValueOnce({ Item: null }); // For nonexistent member

      const result = await fetchOrganizationMembers(mockOrgAccount);
      
      expect(result.owner).toEqual(mockOwnerAccount);
      expect(result.admins).toEqual([mockAdminAccount]);
      expect(result.members).toEqual([mockMemberAccount]);
      expect(mockDocClient.send).toHaveBeenCalledTimes(4);
    });
  });

  describe('Type Guards', () => {
    it('isIndividualAccount should correctly identify individual accounts', () => {
      const individualAccount: IndividualAccount = {
        account_id: 'acc123',
        type: 'individual',
        name: 'Test User',
        emails: [{
          address: 'test@example.com',
          verified: false,
          is_primary: true,
          added_at: new Date().toISOString()
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        disabled: false,
        flags: [],
        metadata_public: {},
        metadata_private: {
          identity_id: 'id123'
        }
      };

      const organizationalAccount: OrganizationalAccount = {
        account_id: 'org123',
        type: 'organization',
        name: 'Test Org',
        emails: [{
          address: 'org@example.com',
          verified: false,
          is_primary: true,
          added_at: new Date().toISOString()
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        disabled: false,
        flags: [],
        metadata_public: {},
        metadata_private: {
          identity_id: 'id123'
        }
      };

      expect(isIndividualAccount(individualAccount)).toBe(true);
      expect(isIndividualAccount(organizationalAccount)).toBe(false);
    });

    it('isOrganizationalAccount should correctly identify organizational accounts', () => {
      const individualAccount: IndividualAccount = {
        account_id: 'acc123',
        type: 'individual',
        name: 'Test User',
        emails: [{
          address: 'test@example.com',
          verified: false,
          is_primary: true,
          added_at: new Date().toISOString()
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        disabled: false,
        flags: [],
        metadata_public: {},
        metadata_private: {
          identity_id: 'id123'
        }
      };

      const organizationalAccount: OrganizationalAccount = {
        account_id: 'org123',
        type: 'organization',
        name: 'Test Org',
        emails: [{
          address: 'org@example.com',
          verified: false,
          is_primary: true,
          added_at: new Date().toISOString()
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        disabled: false,
        flags: [],
        metadata_public: {},
        metadata_private: {
          identity_id: 'id123'
        }
      };

      expect(isOrganizationalAccount(organizationalAccount)).toBe(true);
      expect(isOrganizationalAccount(individualAccount)).toBe(false);
    });
  });
}); 