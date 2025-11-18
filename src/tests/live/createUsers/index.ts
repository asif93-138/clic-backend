import User from "../../../models/user.model";
import { generateToken } from "../../../utils/jwt";
import { memoryStore } from "../memoryStore/memoryStore";


export default async function createBulkUsers(maleCount: number, femaleCount: number) {


    for (let i: number = 1; i <= maleCount; i++) {
        const userObj = {
            email: `user-m-${i}@email.com`,
            password: "$2b$10$dQcFBT6UF7t1oya/zd.cg.0dhoSJqs.FpliFVz7IrcKbkJ9140kOu",
            firstName: "User-M",
            lastName: `${i}`,
            userName: `User-M ${i}`,
            imgURL: "uploads/banner-5.png",
            cloud_imgURL: "default",
            dateOfBirth: "Fri Aug 01 2025 00:00:00 GMT+0600 (Bangladesh Standard Time)",
            gender: "Female",
            city: "Dhaka",
            where_from: "Dhaka",
            ques_ans: `[{"question":"How do you spend most of your time with other people?","selectedAns":"I engage with an eclectic collection of people I've met from all walks of life"},{"question":"Which is the most important trait you look for in a partner?","selectedAns":"Adventurous"},{"question":"Success: what does success mean to you?","selectedAns":"Personal contentment, spiritual awakening and/or emotional freedom"},{"question":"Drugs: Have you taken recreational drugs?","selectedAns":"Sure - Do you have any on you now"},{"question":"Lifestyle: I would prioritize having one of the following holidays in any given year","selectedAns":"Campervan / other adventurous or exploratory trip which may or may not include psychedelics"},{"question":"Setbacks: How do you handle failure?","selectedAns":"I roll with the punches. What goes up must come down. And vice versa."},{"question":"Spirituality:","selectedAns":"I interact with the spiritual world"},{"question":"How could you describe your level of engagement in Sports / physical activity?","selectedAns":"I Run ultra marathons / triathlons / or similar"},{"question":"Love of nature: I am","selectedAns":"Happy to live 50/50 city and country/mountains"},{"question":"How would you describe your taste in music?","selectedAns":"True connoisseur - Classical or jazz"}]`,
            hearingPlatform: "Friends or Family",
            referredBy: "Asif",
            approved: "approved"
        }
        const result: any = await User.create(userObj);
        memoryStore.addUser(result._id.toString(), { username: userObj.userName, token: generateToken({id: result._id.toString()}), gender: "M" })
    }

    for (let i: number = 1; i <= femaleCount; i++) {
        const userObj = {
            email: `user-f-${i}@email.com`,
            password: "$2b$10$dQcFBT6UF7t1oya/zd.cg.0dhoSJqs.FpliFVz7IrcKbkJ9140kOu",
            firstName: "User-F",
            lastName: `${i}`,
            userName: `User-F ${i}`,
            imgURL: "uploads/banner-5.png",
            cloud_imgURL: "default",
            dateOfBirth: "Fri Aug 01 2025 00:00:00 GMT+0600 (Bangladesh Standard Time)",
            gender: "Female",
            city: "Dhaka",
            where_from: "Dhaka",
            ques_ans: `[{"question":"How do you spend most of your time with other people?","selectedAns":"I engage with an eclectic collection of people I've met from all walks of life"},{"question":"Which is the most important trait you look for in a partner?","selectedAns":"Adventurous"},{"question":"Success: what does success mean to you?","selectedAns":"Personal contentment, spiritual awakening and/or emotional freedom"},{"question":"Drugs: Have you taken recreational drugs?","selectedAns":"Sure - Do you have any on you now"},{"question":"Lifestyle: I would prioritize having one of the following holidays in any given year","selectedAns":"Campervan / other adventurous or exploratory trip which may or may not include psychedelics"},{"question":"Setbacks: How do you handle failure?","selectedAns":"I roll with the punches. What goes up must come down. And vice versa."},{"question":"Spirituality:","selectedAns":"I interact with the spiritual world"},{"question":"How could you describe your level of engagement in Sports / physical activity?","selectedAns":"I Run ultra marathons / triathlons / or similar"},{"question":"Love of nature: I am","selectedAns":"Happy to live 50/50 city and country/mountains"},{"question":"How would you describe your taste in music?","selectedAns":"True connoisseur - Classical or jazz"}]`,
            hearingPlatform: "Friends or Family",
            referredBy: "Asif",
            approved: "approved"
        }
        const result: any = await User.create(userObj);
        memoryStore.addUser(result._id.toString(), { username: userObj.userName, token: generateToken({id: result._id.toString()}), gender: "F" })

    }

    const expectedCount = await User.countDocuments({});
    expect(maleCount+femaleCount).toBe(expectedCount);
}