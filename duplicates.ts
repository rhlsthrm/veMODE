import { readFileSync, writeFileSync } from "fs";

interface VoteEntry {
  timestamp: string;
  voter: string;
  votingPowerCastForGauge: string;
  percentageOfTotalVotingPower: string;
  ionDistribution: string;
  ionDistributionParsed: string;
  totalVotingPowerInGauge: string;
  numVotes: string;
  tx: string;
}

function parseCSV(content: string): Record<string, VoteEntry> {
  const lines = content.split("\n");
  const header = lines[0]; // Skip header
  const entries: Record<string, VoteEntry> = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const [
      timestamp,
      voter,
      votingPowerCastForGauge,
      percentageOfTotalVotingPower,
      ionDistribution,
      ionDistributionParsed,
      totalVotingPowerInGauge,
      numVotes,
      tx,
    ] = line.split(",");

    entries[voter.toLowerCase()] = {
      timestamp,
      voter,
      votingPowerCastForGauge,
      percentageOfTotalVotingPower,
      ionDistribution,
      ionDistributionParsed,
      totalVotingPowerInGauge,
      numVotes,
      tx,
    };
  }

  return entries;
}

// Read both CSV files
const votes1Content = readFileSync("votes.csv", "utf-8");
const votes2Content = readFileSync("votes2.csv", "utf-8");

// Parse both files
const votes1 = parseCSV(votes1Content);
const votes2 = parseCSV(votes2Content);

// Find entries where votes2 has higher ionDistribution
const increasedVotes: VoteEntry[] = [];

for (const [voter, vote2] of Object.entries(votes2)) {
  const vote1 = votes1[voter.toLowerCase()];

  if (!vote1) continue;

  if (Number(vote2.ionDistribution) > Number(vote1.ionDistribution)) {
    increasedVotes.push(vote2);
  }
}

// Create new CSV with increased votes
const header =
  "timestamp,voter,votingPowerCastForGauge,percentageOfTotalVotingPower,ionDistribution1,ionDistribution2,ionDistributionDiff,ionDistributionParsed,totalVotingPowerInGauge,numVotes,tx";
const csvContent = [
  header,
  ...increasedVotes.map((vote2) => {
    const vote1 = votes1[vote2.voter.toLowerCase()];
    const ionDist1 = Number(vote1.ionDistribution);
    const ionDist2 = Number(vote2.ionDistribution);
    const difference = ionDist2 - ionDist1;

    return [
      vote2.timestamp,
      vote2.voter,
      vote2.votingPowerCastForGauge,
      vote2.percentageOfTotalVotingPower,
      vote1.ionDistribution, // original distribution
      vote2.ionDistribution, // new distribution
      difference.toString(), // difference
      vote2.ionDistributionParsed,
      vote2.totalVotingPowerInGauge,
      vote2.numVotes,
      vote2.tx,
    ].join(",");
  }),
].join("\n");

// Write the new CSV file
writeFileSync("increased_votes.csv", csvContent);
console.log(
  "Created increased_votes.csv with entries that have higher ion distribution in votes2.csv"
);
