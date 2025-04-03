import type {
  Account,
  IndividualAccount,
  OrganizationalAccount,
  AccountEmail,
  AccountDomain
} from './account_v2';

describe('Account v2 Types', () => {
  describe('AccountEmail', () => {
    it('requires all mandatory fields', () => {
      const email: AccountEmail = {
        address: 'test@example.com',
        verified: false,
        is_primary: true,
        added_at: new Date().toISOString()
      };
      expect(email).toBeDefined();
    });

    it('allows optional fields', () => {
      const email: AccountEmail = {
        address: 'test@example.com',
        verified: true,
        verified_at: new Date().toISOString(),
        is_primary: true,
        added_at: new Date().toISOString()
      };
      expect(email).toBeDefined();
    });
  });

  describe('AccountDomain', () => {
    it('requires all mandatory fields', () => {
      const domain: AccountDomain = {
        domain: 'example.com',
        status: 'unverified',
        created_at: new Date().toISOString()
      };
      expect(domain).toBeDefined();
    });

    it('allows optional fields', () => {
      const domain: AccountDomain = {
        domain: 'example.com',
        status: 'verified',
        verification_method: 'dns',
        verification_token: 'token123',
        verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString() // 1 day from now
      };
      expect(domain).toBeDefined();
    });
  });

  describe('IndividualAccount', () => {
    it('requires all mandatory fields', () => {
      const account: IndividualAccount = {
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
      expect(account).toBeDefined();
    });

    it('allows optional fields', () => {
      const account: IndividualAccount = {
        account_id: 'acc123',
        type: 'individual',
        name: 'Test User',
        emails: [{
          address: 'test@example.com',
          verified: true,
          verified_at: new Date().toISOString(),
          is_primary: true,
          added_at: new Date().toISOString()
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        disabled: false,
        flags: ['verified'],
        metadata_public: {
          location: 'New York',
          bio: 'Test bio',
          orcid: '0000-0002-1825-0097',
          domains: [{
            domain: 'example.com',
            status: 'verified',
            verification_method: 'dns',
            verified_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          }]
        },
        metadata_private: {
          identity_id: 'id123'
        }
      };
      expect(account).toBeDefined();
    });
  });

  describe('OrganizationalAccount', () => {
    it('requires all mandatory fields', () => {
      const account: OrganizationalAccount = {
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
      expect(account).toBeDefined();
    });

    it('allows optional fields', () => {
      const account: OrganizationalAccount = {
        account_id: 'org123',
        type: 'organization',
        name: 'Test Org',
        emails: [{
          address: 'org@example.com',
          verified: true,
          verified_at: new Date().toISOString(),
          is_primary: true,
          added_at: new Date().toISOString()
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        disabled: false,
        flags: ['verified'],
        metadata_public: {
          location: 'New York',
          bio: 'Test org bio',
          ror_id: '03yrm5c26',
          domains: [{
            domain: 'example.org',
            status: 'verified',
            verification_method: 'dns',
            verified_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          }],
          owner_account_id: 'acc123',
          admin_account_ids: ['acc123', 'acc456'],
          member_account_ids: ['acc789']
        },
        metadata_private: {
          identity_id: 'id123'
        }
      };
      expect(account).toBeDefined();
    });
  });
}); 