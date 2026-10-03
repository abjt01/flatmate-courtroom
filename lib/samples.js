// Demo cases so anyone can watch the court rule without rounding up their flatmates.
export const SAMPLES = {
  sink: {
    title: "The Sink Situation",
    blurb: "Late shifts vs. a rajma pan that sat there for three days.",
    style: "high-court",
    language: "en",
    context:
      "Two of us share a 2BHK in Pune. We split rent and groceries 50/50. When we moved in we agreed dishes get done the same night.",
    parties: [
      {
        name: "Aarav",
        story:
          "Kabir leaves his dishes in the sink for two or three days at a time. Last week a pan with dried rajma sat there from Sunday to Wednesday and the whole kitchen smelled. I've reminded him at least five times on WhatsApp. I end up washing his stuff just so I can cook. I don't mind helping sometimes, but it's every week now.",
        wants: "Kabir does his dishes the same night, like we agreed. If he can't, he tells me and does them first thing next morning.",
      },
      {
        name: "Kabir",
        story:
          "I work late shifts at a support centre and get home around 1 am, so same-night dishes aren't realistic for me. I do wash everything, usually on my day off. Aarav uses my non-stick pan and leaves it soaking too, so not everything in the sink is mine. That rajma pan was his Monday dinner. And he never asked me directly, he posted in the group with our other friends in it, which felt like a public callout.",
        wants: "A rule that works with my shifts, like dishes done within 24 hours, and Aarav stops using my pan without asking.",
      },
    ],
  },
  ac: {
    title: "AC at 18°C All Night",
    blurb: "A doubled electricity bill, three flatmates, three theories.",
    style: "filmy",
    language: "hinglish",
    context:
      "Three of us share a flat in Bengaluru. The electricity bill is split three ways. Last month's bill was ₹6,900, about double the usual.",
    parties: [
      {
        name: "Meera",
        story:
          "I get migraines when it's stuffy, so yes, I run the AC in my room at night, but it's my room and I keep the door closed. Everyone uses the geyser, and Riya's gaming PC is on all day. We've always split bills equally and nobody complained when the geyser bill went up in winter.",
        wants: "Keep splitting equally. I'll set the AC to 22 instead of 18.",
      },
      {
        name: "Tanvi",
        story:
          "Meera runs the AC at 18 from 10 pm to 9 am, every single night, and the bill doubled the month she started. My room shares a wall with hers and it's freezing, I sleep under two blankets. I'm a student on a stipend and ₹2,300 for electricity is a lot for me.",
        wants: "Meera pays the extra over our usual bill, roughly ₹3,400, and the AC is capped at 24.",
      },
      {
        name: "Riya",
        story:
          "I was away for work for 12 days last month and still paid a full third. My PC is on when I work from home, sure, but I wasn't even here for half the month. I don't care what temperature the AC is at, I just don't want to pay for days I wasn't home.",
        wants: "Split bills by who was actually home, or at least give me a discount for the days I was away.",
      },
    ],
  },
  guest: {
    title: "The Guest Who Never Left",
    blurb: "Three nights or five? Depends who you ask.",
    style: "mediator",
    language: "en",
    context: "Two of us rent a flat in Gurgaon and split rent, groceries and the wifi.",
    parties: [
      {
        name: "Rohan",
        story:
          "Dev's girlfriend has been staying over four or five nights a week for two months. She showers in the mornings right when I need to leave, so I've been late to work. She uses our groceries and the wifi. I like her, but I didn't sign up for a third flatmate and nobody asked me.",
        wants: "A limit of two nights a week, or she chips in for groceries and bills.",
      },
      {
        name: "Dev",
        story:
          "She stays over maybe three nights a week, not five, and she usually brings food or cooks for all three of us. Rohan's friends crash on the couch some weekends and I've never said anything. I do agree the morning bathroom thing is a problem, I didn't realise he was getting late.",
        wants: "No hard limit on nights. Let's sort out a bathroom schedule for mornings.",
      },
    ],
  },
};
