# Psychology playbook: what the website uses, and why

Every persuasion technique on marshallwebz.netlify.app is backed by published research and kept honest. Use the same ideas on sales calls and in client websites. Nothing here relies on fake reviews, fake timers or invented numbers. That backfires once people notice, and it breaks Australian Consumer Law (misleading or deceptive conduct, s18).

## What's on the site

| Technique | The evidence | Where it's used |
|---|---|---|
| **First impressions are instant** | People rate a website's visual appeal in about 50 milliseconds, and those snap judgements stay consistent (Lindgaard, Fernandes, Dudek & Brown, 2006, *Behaviour & Information Technology*). | "Backed by research" section on the homepage; the reason the hero is clean, with one headline and two buttons. |
| **Design drives trust** | In a Stanford study of over 2,500 people, 46% of comments about a site's credibility were about its look and design (Fogg et al., 2003). | "Backed by research" section; also a talking point on calls. |
| **Speed matters on phones** | 53% of mobile visits are abandoned if a page takes longer than 3 seconds to load (Google, 2016, *The Need for Mobile Speed*). | "Backed by research" section, linking to the free speed check. |
| **Small steps first (foot-in-the-door)** | People who agree to a small request are more likely to agree to a bigger one (Freedman & Fraser, 1966). | The quote form starts with two easy taps (business type, what you need) before asking for contact details. |
| **Progress pulls people forward (goal gradient)** | People speed up as they get closer to a goal (Kivetz, Urminsky & Zheng, 2006). | "Step 1 of 3" with a progress bar on the quote form, plus "nearly there" and "last one" labels. |
| **Plans make people follow through (implementation intentions)** | Deciding *when* you'll do something makes you much more likely to do it (Gollwitzer, 1999). | "Best time for a quick 15-minute call" on the form. The thank-you message repeats it ("I'll call you in the arvo"). Call at that time. |
| **Daily framing (pennies-a-day)** | A cost shown as a small daily amount feels easier to accept than the same total shown in one lump (Gourville, 1998). | "That's about $1.32 a day" under each monthly price. |
| **Loss aversion** | Losses weigh about twice as heavily as equal gains (Kahneman & Tversky, 1979; Tversky & Kahneman, 1991). | Calculator: "Waiting 3 months could mean about $X of work going to someone else", worked out from the visitor's own numbers and labelled as an illustration. |
| **Risk reversal** | Removing the risk of a bad decision makes it easier to say yes (risk aversion, Kahneman & Tversky, 1979). | The free mockup: "Love it or pay $0". |
| **Reciprocity** | People feel inclined to return a favour (Cialdini, *Influence*, 1984; Regan, 1971). | Free website speed check, and the free mockup before any money changes hands. |
| **Real scarcity, with a reason** | Scarce things seem more valuable (Worchel, Lee & Adewole, 1975), and requests with a reason get more yeses (Langer, Blank & Chanowitz, 1978). | Founding offer: 5 spots, counted down from the owner panel, "in return for an honest testimonial". Only lower the count when someone actually signs. |
| **Liking and similarity** | We trust people who are like us and close to us (Cialdini, 1984). | "A real local", founder section, "meet at your shop". |
| **A clear recommendation (compromise effect)** | When unsure, people pick the option that's clearly recommended or in the middle (Simonson, 1989). | The featured package's badge. Use an honest label such as "Recommended" or "New", never "Most popular" until it's true. |

## How the website looks, and why

| Design choice | The evidence |
|---|---|
| **Light background, dark text** | Dark text on a light background is read faster and more accurately than light text on dark (Piepenbrock, Mayr, Mund & Buchner, 2013, *Ergonomics*). |
| **Simple and familiar layout** (logo left, menu right, headline and button first, nothing swirling in the background) | Websites with low visual complexity and a familiar ("prototypical") layout get the best first impressions (Tuch, Presslaber, Stöcklin, Opwis & Bargas-Avila, 2012, *International Journal of Human-Computer Studies*). |
| **Navy as the main colour** | Blue is consistently read as competent and trustworthy (Labrecque & Milne, 2012, *Journal of the Academy of Marketing Science*). |
| **Gold only on the main "Get my free mockup" buttons** | An item that differs from everything around it is noticed and remembered (isolation effect, von Restorff, 1933). Don't use gold for anything else. |
| **Good-looking design** | People judge attractive interfaces as easier to use and more trustworthy (aesthetic-usability effect: Kurosu & Kashimura, 1995; Tractinsky, Katz & Ikar, 2000). |
| **Big buttons, plus a sticky Call / Free mockup bar on phones** | Bigger, closer targets are faster and easier to hit (Fitts, 1954). |
| **The guarantee sits right next to the price** | Paying feels painful, and reassurance at that moment softens it (Prelec & Loewenstein, 1998). |
| **A real face** (add your photo, see below) | Photos of people on a website increase trust and the feeling of dealing with a real person (Cyr, Head, Larios & Pan, 2009, *MIS Quarterly*). |
| **The page follows the buyer's questions in order**: what is it, why it matters, proof, how it works, price, risk, who you are, questions, act | Each question is answered just as it comes up, and the last thing they see is the action (serial position effect: Murdock, 1962). |

**Add your photo:** put a friendly, well-lit photo of yourself at `docs/assets/img/declan.jpg`, then set `"ownerPhoto": "assets/img/declan.jpg"` in `site/config.json` and run `node site/build.js`. The founder card on the homepage uses it instead of the "DM" initials.

## What we don't do

- **No "Most popular" or "Popular" labels** until enough clients have actually chosen it. These were changed to "Recommended" and "Easiest start".
- **No fake reviews or testimonials.** Add real ones as founding clients come in. Concept sites are always labelled "Concept".
- **No fake countdowns, "only 2 left!" pop-ups or "someone just bought" notifications.**
- **No invented statistics.** Every number on the site above has a named source. If you add a stat, add its source too.

## Keep it consistent

Mixed messages hurt trust. If the site says one thing and a package says another (for example, "Love it or pay $0" next to a cancellation fee), people notice. Keep your offer the same everywhere: homepage, packages, sales calls and agreements.
