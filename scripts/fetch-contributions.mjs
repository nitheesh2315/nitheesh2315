import fs from "node:fs";

const user = process.env.GH_USER || process.env.GITHUB_REPOSITORY_OWNER;
const token = process.env.GITHUB_TOKEN;
if (!user || !token) throw new Error("GH_USER and GITHUB_TOKEN are required");

const query = `query($login:String!){
  user(login:$login){
    contributionsCollection{
      contributionCalendar{
        weeks{ contributionDays{ date contributionCount } }
      }
    }
  }
}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "profile-heatmap",
  },
  body: JSON.stringify({ query, variables: { login: user } }),
});
if (!res.ok) throw new Error(`GitHub API ${res.status}`);
const json = await res.json();
if (json.errors) throw new Error(JSON.stringify(json.errors));

const weeks = json.data.user.contributionsCollection.contributionCalendar.weeks.map((w) =>
  w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))
);

fs.mkdirSync("data", { recursive: true });
fs.writeFileSync("data/contributions.json", JSON.stringify({ user, weeks }));
console.log(`Saved ${weeks.length} weeks for ${user}`);
