import { mode } from "viem/chains";
import { createPublicClient, formatEther, http, parseEther } from "viem";
import { gaugeAbi } from "./gaugeAbi";
import { writeFileSync } from "fs";

const EPOCH = 1435n;

const client = createPublicClient({
  chain: mode,
  transport: http(),
});

const ionToDistribute = parseEther("450000");

const logs = await client.getContractEvents({
  abi: gaugeAbi,
  address: "0x71439Ae82068E19ea90e4F506c74936aE170Cf58",
  fromBlock: 14405098n,
  eventName: "Voted",
  args: { gauge: "0x8be11aBd61E07EF9d4551aCdd43bb390E3CE03Bd", epoch: EPOCH },
});

const desynLogs = await client.getContractEvents({
  abi: gaugeAbi,
  address: "0x71439Ae82068E19ea90e4F506c74936aE170Cf58",
  fromBlock: 14405098n,
  eventName: "Voted",
  args: { gauge: "0x78b7C35d2B8cdFf03971935832DDD2BBc54D8BD0", epoch: EPOCH },
});

const totalVotingPowerInGauge = logs.reduce((acc, v) => {
  return acc + (v.args.votingPowerCastForGauge ?? 0n);
}, 0n);
console.log("totalVotingPowerInGauge", totalVotingPowerInGauge);

const votes = logs
  .map((l) => {
    let votingPowerCastForGauge = l.args.votingPowerCastForGauge!;
    let tx = [l.transactionHash];
    let numVotes = 1;
    let votesCast = [l.args.votingPowerCastForGauge!];

    const percentageOfTotalVotingPower =
      Number(votingPowerCastForGauge) / Number(totalVotingPowerInGauge);

    const ionDistribution =
      percentageOfTotalVotingPower * Number(formatEther(ionToDistribute));

    return {
      voter: l.args.voter!,
      timestamp: l.args.timestamp!,
      votingPowerCastForGauge,
      percentageOfTotalVotingPower,
      ionDistribution,
      ionDistributionParsed: parseEther(ionDistribution.toString()),
      votesCast,
      tx,
      totalVotingPowerInGauge: l.args.totalVotingPowerInGauge!,
      numVotes,
    };
  })
  .filter((v) => v.ionDistribution > 1);

const totalVotingPowerCast = votes.reduce((acc, v) => {
  return acc + v.votingPowerCastForGauge;
}, 0n);
console.log("totalVotingPowerCast", totalVotingPowerCast);

const totalPercentage = votes.reduce((acc, v) => {
  return acc + v.percentageOfTotalVotingPower;
}, 0);
console.log("totalPercentage", totalPercentage);

const desynUniqueVoters = [...new Set(desynLogs.map((l) => l.args.voter!))];
const desynVotes = desynUniqueVoters
  .map((voter) => {
    const votesBoth = votes.filter((v) => v.voter === voter);
    const totalVotesCast = votesBoth.reduce((acc, v) => {
      return acc + v.votingPowerCastForGauge;
    }, 0n);

    const percentageOfTotalVotingPower =
      (Number(totalVotesCast) / Number(totalVotingPowerInGauge)) * 100;

    const ionDistribution =
      ((percentageOfTotalVotingPower * Number(formatEther(ionToDistribute))) /
        100) *
      0.2;

    return {
      voter,
      ionDistribution,
      ionDistributionParsed: parseEther(ionDistribution.toString()),
    };
  })
  .filter((v) => v.ionDistribution > 0);

// Convert logs to CSV format
const csvHeader =
  "timestamp,voter,votingPowerCastForGauge,percentageOfTotalVotingPower,ionDistribution,ionDistributionParsed,votesCast,totalVotingPowerInGauge,numVotes,tx\n";
const csvData = votes
  .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
  .map((v) => [
    v.timestamp,
    v.voter,
    v.votingPowerCastForGauge,
    v.percentageOfTotalVotingPower,
    v.ionDistribution,
    v.ionDistributionParsed,
    v.votesCast,
    v.totalVotingPowerInGauge,
    v.numVotes,
    v.tx,
  ]);
const csvContent = csvHeader + csvData.join("\n");

// Write to file
writeFileSync(`epoch_${EPOCH}.csv`, csvContent);
console.log("CSV file has been written successfully");

const totalIonDistribution = votes.reduce((acc, v) => {
  return acc + v.ionDistribution;
}, 0);
console.log("totalIonDistribution", totalIonDistribution);

const desynCsvHeader = "voter,ionDistribution,ionDistributionParsed\n";
const desynCsvData = desynVotes
  .sort((a, b) => Number(a.ionDistribution) - Number(b.ionDistribution))
  .map((v) => [v.voter, v.ionDistribution, v.ionDistributionParsed]);
const desynCsvContent = desynCsvHeader + desynCsvData.join("\n");
writeFileSync(`desyn_epoch_${EPOCH}.csv`, desynCsvContent);
console.log("CSV file has been written successfully");

const totalIonDistributionDesyn = desynVotes.reduce((acc, v) => {
  return acc + v.ionDistribution;
}, 0);
console.log("totalIonDistributionDesyn", totalIonDistributionDesyn);

const uniqueVoters = [...new Set(votes.map((v) => v.voter))];
// pick 3 random voters
const randomVoters = uniqueVoters.sort(() => Math.random() - 0.5).slice(0, 3);
console.log("randomVoters", randomVoters);
