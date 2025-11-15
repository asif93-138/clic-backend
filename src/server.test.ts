// TypeScript
/**
 * Tests for liveMatches in src/server.ts
 *
 * Setup:
 *  - yarn add -D jest ts-jest @types/jest rewire
 *  - npx ts-jest config:init
 *  - Add "test": "jest" to package.json scripts
 *
 * These tests use rewire to access the non-exported liveMatches function and mock imported models.
 */

const mockWaitingFind = jest.fn();
const mockCallHistoryFind = jest.fn();
const mockUserFindById = jest.fn();

jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('../dist/config/dbConfig', () => jest.fn());
jest.mock('../dist/jobs/sendNotification', () => jest.fn());
jest.mock('express', () => {
  const actualExpress = jest.requireActual('express');
  return actualExpress;
});

// Mock the model modules before loading server.ts
jest.mock('../dist/models/waitingRoom', () => {
  return { find: mockWaitingFind };
});
jest.mock('../dist/models/callHistory', () => {
  return { find: mockCallHistoryFind };
});
jest.mock('../dist/models/user.model', () => {
  return { findById: mockUserFindById };
});

// Other models imported by server.ts can be left as empty mocks to avoid runtime errors
jest.mock('../dist/models/event', () => ({}));
jest.mock('../dist/models/datingRoom', () => ({}));
jest.mock('../dist/models/matched', () => ({}));
jest.mock('../dist/models/failedClic', () => ({}));
jest.mock('../dist/config/agenda', () => ({}));
jest.mock('agora-token', () => ({}));

describe('liveMatches (server.ts)', () => {
  let srv: any;
  let liveMatches: any;
  let mockEmit: jest.Mock;

  beforeAll(() => {
    const rewire = require('rewire');
    srv = rewire('../dist/server.js');
    liveMatches = srv.__get__('liveMatches');
    
    // Replace the user model with a mock AFTER rewire loads
    const mockUserModel = {
      default: {
        findById: mockUserFindById
      }
    };
    srv.__set__('user_model_1', mockUserModel);
  });

  beforeEach(() => {
    mockWaitingFind.mockClear();
    mockCallHistoryFind.mockClear();
    mockUserFindById.mockClear();
    mockEmit = jest.fn();
    srv.__set__('io', { emit: mockEmit });
  });

  afterAll(async () => {
    try {
      const s = srv.__get__('server');
      if (s && typeof s.close === 'function') {
        await new Promise<void>((resolve) => {
          s.close(() => resolve());
          setTimeout(resolve, 100); // force close after 100ms
        });
      }
    } catch (e) {
      // ignore
    }
    // Disconnect mongoose
    try {
      const mongoose = require('mongoose');
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }
  });

  test('returns potentialMatches and emits event when there is one waiting user and no call history', async () => {
    const event_id = 'event1';
    const user_id = 'u1';
    const gender = 'M';
    const interested = 'F';

    // WaitingRoom.find returns one user matching interested gender
    mockWaitingFind.mockResolvedValue([{ user_id: 'u2' }]);

    // No call history for this event
    mockCallHistoryFind.mockResolvedValue([]);

    // User.findById called for potential matches and the requesting user
    mockUserFindById.mockImplementation(async (id: string) => {
      if (id === 'u2') return { _id: 'u2', userName: 'User2', imgURL: 'url2' };
      if (id === 'u1') return { _id: 'u1', userName: 'User1', imgURL: 'url1' };
      return null;
    });

    const result = await liveMatches({ event_id, user_id, gender, interested, rejoin: false });

    // Expect history array empty, one potential match returned
    expect(result).toBeDefined();
    expect(Array.isArray(result.historyArr)).toBe(true);
    expect(result.historyArr.length).toBe(0);
    expect(Array.isArray(result.potentialMatches)).toBe(true);
    expect(result.potentialMatches.length).toBe(1);
    expect(result.potentialMatches[0]).toMatchObject({ _id: 'u2', userName: 'User2', imgURL: 'url2' });

    // Expect io.emit called to broadcast potential matches with the requesting user's own data
    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith(`${event_id}-${gender}-potential-matches`, { _id: 'u1', userName: 'User1', imgURL: 'url1' });
  });

  test('filters out users present in call history and returns other potential matches; historyArr contains previous contacts', async () => {
    const event_id = 'event2';
    const user_id = 'u1';
    const gender = 'M';
    const interested = 'F';

    // Two waiting users u2 and u3
    mockWaitingFind.mockResolvedValue([{ user_id: 'u2' }, { user_id: 'u3' }]);

    // Call history indicates u2 was already contacted by u1 and there is another contact u4
    mockCallHistoryFind.mockResolvedValue([
      { person_1: 'u1', person_2: 'u2' },
      { person_1: 'u4', person_2: 'u1' }
    ]);

    mockUserFindById.mockImplementation(async (id: string) => {
      return { _id: id, userName: `User-${id}`, imgURL: `url-${id}` };
    });

    const result = await liveMatches({ event_id, user_id, gender, interested, rejoin: false });

    expect(result).toBeDefined();
    expect(Array.isArray(result.historyArr)).toBe(true);
    expect(result.historyArr).toEqual(expect.arrayContaining(['u2', 'u4']));

    expect(Array.isArray(result.potentialMatches)).toBe(true);
    expect(result.potentialMatches.length).toBe(1);
    expect(result.potentialMatches[0]).toMatchObject({ _id: 'u3', userName: 'User-u3', imgURL: 'url-u3' });

    expect(mockEmit).toHaveBeenCalledWith(`${event_id}-${gender}-potential-matches`, { _id: 'u1', userName: 'User-u1', imgURL: 'url-u1' });
  });

  test('returns undefined when rejoin is true (no processing)', async () => {
    const res = await liveMatches({ event_id: 'e', user_id: 'u', gender: 'M', interested: 'F', rejoin: true });
    expect(res).toBeUndefined();
    expect(mockEmit).not.toHaveBeenCalled();
  });
});