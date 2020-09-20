import { AWSError, Kinesis } from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';

interface Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

export async function getKinesisInstance(credentials: Credentials | undefined): Promise<Kinesis> {
  return new Kinesis(credentials);
}

export async function createKinesisStream(
  streamName: string,
  shardCount: number,
  kinesis: Kinesis,
): Promise<PromiseResult<Kinesis.DescribeStreamOutput, AWSError>> {
  await kinesis.createStream({ StreamName: streamName, ShardCount: shardCount }).promise();

  return kinesis
    .waitFor('streamExists', {
      StreamName: streamName,
    })
    .promise();
}

export async function deleteKinesisStream(streamName: string, kinesis: Kinesis): Promise<PromiseResult<{}, AWSError>> {
  return await kinesis.deleteStream({ StreamName: streamName, EnforceConsumerDeletion: true }).promise();
}

export async function getKinesisShardIterator(
  streamName: string,
  shardId: string,
  sequenceNumber: string,
  kinesis: Kinesis,
): Promise<PromiseResult<Kinesis.GetShardIteratorOutput, AWSError>> {
  return await kinesis
    .getShardIterator({
      StreamName: streamName,
      ShardId: shardId,
      ShardIteratorType: 'AT_SEQUENCE_NUMBER',
      StartingSequenceNumber: sequenceNumber,
    })
    .promise();
}

export async function getRecordsFromStream(
  shardIterator: string,
  kinesis: Kinesis,
): Promise<PromiseResult<Kinesis.GetRecordsOutput, AWSError>> {
  return await kinesis.getRecords({ ShardIterator: shardIterator }).promise();
}
