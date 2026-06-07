export interface DailyQuote {
  q: string
  a: string
}

const QUOTES: DailyQuote[] = [
  { q: "Take care of your body. It's the only place you have to live.", a: "Jim Rohn" },
  { q: "Health is not about the weight you lose, but about the life you gain.", a: "Unknown" },
  { q: "To keep the body in good health is a duty, otherwise we shall not be able to keep our mind strong and clear.", a: "Buddha" },
  { q: "The greatest wealth is health.", a: "Virgil" },
  { q: "He who has health has hope, and he who has hope has everything.", a: "Thomas Carlyle" },
  { q: "A healthy outside starts from the inside.", a: "Robert Urich" },
  { q: "Sleep is the best meditation.", a: "Dalai Lama" },
  { q: "Your body hears everything your mind says.", a: "Naomi Judd" },
  { q: "The first wealth is health.", a: "Ralph Waldo Emerson" },
  { q: "Physical fitness is not only one of the most important keys to a healthy body, it is the basis of dynamic and creative intellectual activity.", a: "John F. Kennedy" },
  { q: "An apple a day keeps the doctor away.", a: "Benjamin Franklin" },
  { q: "Wellness is the complete integration of body, mind, and spirit.", a: "Greg Anderson" },
  { q: "It is health that is real wealth and not pieces of gold and silver.", a: "Mahatma Gandhi" },
  { q: "Happiness is nothing more than good health and a bad memory.", a: "Albert Schweitzer" },
  { q: "The human body is the best picture of the human soul.", a: "Ludwig Wittgenstein" },
  { q: "A good laugh and a long sleep are the best cures in the doctor's book.", a: "Irish Proverb" },
  { q: "Exercise is a celebration of what your body can do. Not a punishment for what you ate.", a: "Unknown" },
  { q: "Water is the driving force of all nature.", a: "Leonardo da Vinci" },
  { q: "Drink water, eat greens, get sleep. Wellness doesn't have to be complicated.", a: "Unknown" },
  { q: "The doctor of the future will give no medicine but will interest his patients in the care of the human frame, in diet, and in the cause and prevention of disease.", a: "Thomas Edison" },
  { q: "Every day is a chance to be better than yesterday.", a: "Unknown" },
  { q: "Small steps every day lead to big results over time.", a: "Unknown" },
  { q: "Your health is an investment, not an expense.", a: "Unknown" },
  { q: "Movement is a medicine for creating change in a person's physical, emotional, and mental states.", a: "Carol Welch" },
  { q: "Those who think they have no time for bodily exercise will sooner or later have to find time for illness.", a: "Edward Stanley" },
  { q: "Nutrition is not a punishment. Food is fuel, and your body deserves the best.", a: "Unknown" },
  { q: "You don't have to be great to start, but you have to start to be great.", a: "Zig Ziglar" },
  { q: "Rest when you're weary. Refresh and renew yourself, your body, your mind, your spirit.", a: "Ralph Marston" },
  { q: "The mind and body are not separate. What affects one, affects the other.", a: "Unknown" },
  { q: "A fit body, a calm mind, a house full of love. These things cannot be bought — they must be earned.", a: "Naval Ravikant" },
  { q: "Keeping your body healthy is an expression of gratitude to the whole cosmos.", a: "Thich Nhat Hanh" },
  { q: "Motivation is what gets you started. Habit is what keeps you going.", a: "Jim Ryun" },
  { q: "You are what you repeatedly do. Excellence is not an act, but a habit.", a: "Aristotle" },
  { q: "The secret of getting ahead is getting started.", a: "Mark Twain" },
  { q: "Believe you can and you're halfway there.", a: "Theodore Roosevelt" },
  { q: "Don't wish for a good body, work for it.", a: "Unknown" },
  { q: "What seems impossible today will one day become your warm-up.", a: "Unknown" },
  { q: "Strength does not come from physical capacity. It comes from an indomitable will.", a: "Mahatma Gandhi" },
  { q: "It does not matter how slowly you go as long as you do not stop.", a: "Confucius" },
  { q: "Good health is not something we can buy. However, it can be an extremely valuable savings account.", a: "Anne Wilson Schaef" },
  { q: "A healthy lifestyle is the most potent medicine at your disposal.", a: "Sravani Saha Nakhro" },
  { q: "The food you eat can be either the safest and most powerful form of medicine, or the slowest form of poison.", a: "Ann Wigmore" },
  { q: "Hydration is key — your brain is 75% water. Drink up.", a: "Unknown" },
  { q: "Sleep is not a luxury. It is a necessity and a foundation for a healthy life.", a: "Unknown" },
  { q: "You have to expect things of yourself before you can do them.", a: "Michael Jordan" },
  { q: "Take care of your body and your body will take care of you.", a: "Unknown" },
  { q: "Consistency is the key to achieving and maintaining momentum.", a: "Darren Hardy" },
  { q: "A year from now you may wish you had started today.", a: "Karen Lamb" },
  { q: "Progress, not perfection.", a: "Unknown" },
  { q: "Your future self is watching you right now through your memories. Make it proud.", a: "Unknown" },
  { q: "The only bad workout is the one that didn't happen.", a: "Unknown" },
  { q: "Eat to live, not live to eat.", a: "Socrates" },
  { q: "Take care of your mind, your body will follow.", a: "Unknown" },
  { q: "Every workout is progress. Every healthy meal is progress. Every good night's sleep is progress.", a: "Unknown" },
  { q: "The pain you feel today will be the strength you feel tomorrow.", a: "Unknown" },
  { q: "Wellness is a journey, not a destination.", a: "Unknown" },
  { q: "Don't count the days, make the days count.", a: "Muhammad Ali" },
  { q: "Success is the sum of small efforts, repeated day in and day out.", a: "Robert Collier" },
  { q: "Your body can do it. It's your mind you need to convince.", a: "Unknown" },
  { q: "Nourishing yourself in a way that helps you blossom in the direction you want to go is attainable.", a: "Deborah Day" },
  { q: "The secret to living well and longer is: eat half, walk double, laugh triple, and love without measure.", a: "Tibetan Proverb" }
]

export function getQuoteOfTheDay(): DailyQuote {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / 86_400_000)
  return QUOTES[dayOfYear % QUOTES.length]
}
