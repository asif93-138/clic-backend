import connectDB from "./config/dbConfig";
import User from "./models/user.model"

connectDB();

// const mockWaitingFind = jest.fn();
// const mockCallHistoryFind = jest.fn();
// const mockUserFindById = jest.fn();

// jest.mock('dotenv', () => ({ config: jest.fn() }));
// jest.mock('../dist/config/dbConfig', () => jest.fn());
// jest.mock('../dist/jobs/sendNotification', () => jest.fn());
// jest.mock('express', () => {
//   const actualExpress = jest.requireActual('express');
//   return actualExpress;
// });

// // Mock the model modules before loading server.ts
// jest.mock('../dist/models/waitingRoom', () => {
//   return { find: mockWaitingFind };
// });
// jest.mock('../dist/models/callHistory', () => {
//   return { find: mockCallHistoryFind };
// });
// jest.mock('../dist/models/user.model', () => {
//   return { findById: mockUserFindById };
// });

// // Other models imported by server.ts can be left as empty mocks to avoid runtime errors
// jest.mock('../dist/models/event', () => ({}));
// jest.mock('../dist/models/datingRoom', () => ({}));
// jest.mock('../dist/models/matched', () => ({}));
// jest.mock('../dist/models/failedClic', () => ({}));
// jest.mock('../dist/config/agenda', () => ({}));
// jest.mock('agora-token', () => ({}));

// describe('liveMatches (server.ts)', () => {
//   let srv: any;
//   let liveMatches: any;
//   let mockEmit: jest.Mock;

//   beforeAll(() => {
//     const rewire = require('rewire');
//     srv = rewire('../dist/server.js');
//     liveMatches = srv.__get__('liveMatches');

//     // Replace the user model with a mock AFTER rewire loads
//     const mockUserModel = {
//       default: {
//         findById: mockUserFindById
//       }
//     };
//     srv.__set__('user_model_1', mockUserModel);
//   });

//   beforeEach(() => {
//     mockWaitingFind.mockClear();
//     mockCallHistoryFind.mockClear();
//     mockUserFindById.mockClear();
//     mockEmit = jest.fn();
//     srv.__set__('io', { emit: mockEmit });
//   });

//   afterAll(async () => {
//     try {
//       const s = srv.__get__('server');
//       if (s && typeof s.close === 'function') {
//         await new Promise<void>((resolve) => {
//           s.close(() => resolve());
//           setTimeout(resolve, 100); // force close after 100ms
//         });
//       }
//     } catch (e) {
//       // ignore
//     }
//     // Disconnect mongoose
//     try {
//       const mongoose = require('mongoose');
//       await mongoose.disconnect();
//     } catch (e) {
//       // ignore
//     }
//   });

//   test('returns potentialMatches and emits event when there is one waiting user and no call history', async () => {
//     const event_id = 'event1';
//     const user_id = 'u1';
//     const gender = 'M';
//     const interested = 'F';

//     // WaitingRoom.find returns one user matching interested gender
//     mockWaitingFind.mockResolvedValue([{ user_id: 'u2' }]);

//     // No call history for this event
//     mockCallHistoryFind.mockResolvedValue([]);

//     // User.findById called for potential matches and the requesting user
//     mockUserFindById.mockImplementation(async (id: string) => {
//       if (id === 'u2') return { _id: 'u2', userName: 'User2', imgURL: 'url2' };
//       if (id === 'u1') return { _id: 'u1', userName: 'User1', imgURL: 'url1' };
//       return null;
//     });

//     const result = await liveMatches({ event_id, user_id, gender, interested, rejoin: false });

//     // Expect history array empty, one potential match returned
//     expect(result).toBeDefined();
//     expect(Array.isArray(result.historyArr)).toBe(true);
//     expect(result.historyArr.length).toBe(0);
//     expect(Array.isArray(result.potentialMatches)).toBe(true);
//     expect(result.potentialMatches.length).toBe(1);
//     expect(result.potentialMatches[0]).toMatchObject({ _id: 'u2', userName: 'User2', imgURL: 'url2' });

//     // Expect io.emit called to broadcast potential matches with the requesting user's own data
//     expect(mockEmit).toHaveBeenCalledTimes(1);
//     expect(mockEmit).toHaveBeenCalledWith(`${event_id}-${gender}-potential-matches`, { _id: 'u1', userName: 'User1', imgURL: 'url1' });
//   });

//   test('filters out users present in call history and returns other potential matches; historyArr contains previous contacts', async () => {
//     const event_id = 'event2';
//     const user_id = 'u1';
//     const gender = 'M';
//     const interested = 'F';

//     // Two waiting users u2 and u3
//     mockWaitingFind.mockResolvedValue([{ user_id: 'u2' }, { user_id: 'u3' }]);

//     // Call history indicates u2 was already contacted by u1 and there is another contact u4
//     mockCallHistoryFind.mockResolvedValue([
//       { person_1: 'u1', person_2: 'u2' },
//       { person_1: 'u4', person_2: 'u1' }
//     ]);

//     mockUserFindById.mockImplementation(async (id: string) => {
//       return { _id: id, userName: `User-${id}`, imgURL: `url-${id}` };
//     });

//     const result = await liveMatches({ event_id, user_id, gender, interested, rejoin: false });

//     expect(result).toBeDefined();
//     expect(Array.isArray(result.historyArr)).toBe(true);
//     expect(result.historyArr).toEqual(expect.arrayContaining(['u2', 'u4']));

//     expect(Array.isArray(result.potentialMatches)).toBe(true);
//     expect(result.potentialMatches.length).toBe(1);
//     expect(result.potentialMatches[0]).toMatchObject({ _id: 'u3', userName: 'User-u3', imgURL: 'url-u3' });

//     expect(mockEmit).toHaveBeenCalledWith(`${event_id}-${gender}-potential-matches`, { _id: 'u1', userName: 'User-u1', imgURL: 'url-u1' });
//   });

//   // test('returns undefined when rejoin is true (no processing)', async () => {
//   //   const res = await liveMatches({ event_id: 'e', user_id: 'u', gender: 'M', interested: 'F', rejoin: true });
//   //   expect(res).toBeUndefined();
//   //   expect(mockEmit).not.toHaveBeenCalled();
//   // });
// });
// "pretest": "tsc -p tsconfig.build.json",


// const arr = [];
// for (let i = 1; i < 3; i++) {
//     arr.push({
//         email: `user-${i}@email.com`,
//         password: "$2b$10$dQcFBT6UF7t1oya/zd.cg.0dhoSJqs.FpliFVz7IrcKbkJ9140kOu",
//         firstName: "User",
//         lastName: `${i}`,
//         userName: `User ${i}`,
//         imgURL: "uploads/banner-5.png",
//         cloud_imgURL: "default",
//         dateOfBirth: "Fri Aug 01 2025 00:00:00 GMT+0600 (Bangladesh Standard Time)",
//         gender: i % 2 == 0 ? "Female" : "Male",
//         city: "Dhaka",
//         where_from: "Dhaka",
//         ques_ans: `[{"question":"How do you spend most of your time with other people?","selectedAns":"I engage with an eclectic collection of people I've met from all walks of life"},{"question":"Which is the most important trait you look for in a partner?","selectedAns":"Adventurous"},{"question":"Success: what does success mean to you?","selectedAns":"Personal contentment, spiritual awakening and/or emotional freedom"},{"question":"Drugs: Have you taken recreational drugs?","selectedAns":"Sure - Do you have any on you now"},{"question":"Lifestyle: I would prioritize having one of the following holidays in any given year","selectedAns":"Campervan / other adventurous or exploratory trip which may or may not include psychedelics"},{"question":"Setbacks: How do you handle failure?","selectedAns":"I roll with the punches. What goes up must come down. And vice versa."},{"question":"Spirituality:","selectedAns":"I interact with the spiritual world"},{"question":"How could you describe your level of engagement in Sports / physical activity?","selectedAns":"I Run ultra marathons / triathlons / or similar"},{"question":"Love of nature: I am","selectedAns":"Happy to live 50/50 city and country/mountains"},{"question":"How would you describe your taste in music?","selectedAns":"True connoisseur - Classical or jazz"}]`,
//         hearingPlatform: "Friends or Family",
//         referredBy: "Asif",
//         approved: "approved"
//     });
// }

// (async function () {
//     const result = await User.create(arr);
//     console.log(result);
//     // result.forEach(x => console.log(x._id));
// })();

(async function () {
    const result = await User.deleteMany({createdAt: { $gt: new Date("2025-11-16T06:00:00.000Z") }});
    console.log(result);
})();