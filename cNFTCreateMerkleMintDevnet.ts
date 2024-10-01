// 
// 
//         This Code creates cNFT in Devnet Mode
// 
// 

import dotenv from 'dotenv';
dotenv.config();
import * as fs from 'fs';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {mplTokenMetadata, createNft} from '@metaplex-foundation/mpl-token-metadata';
import {generateSigner, percentAmount, createGenericFile, signerIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi';
import { addrToLink } from './utils';
import * as bs58 from 'bs58';
import { publicKey } from '@metaplex-foundation/umi';
import { readCsv } from './utils';
import { fetchMerkleTree, mintToCollectionV1, mplBubblegum, createTree } from '@metaplex-foundation/mpl-bubblegum';
import { Connection, LAMPORTS_PER_SOL, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { myKey } from './key';


const collectionName = "Solana Fellowship Session 8"
const collectionSymbol = 'S8'
const collectionDesc = 'cNFT of my Profile picture and social media links'
const collectUrl  = "https://amber-electrical-marten-124.mypinata.cloud/ipfs/QmRhwC2aXWMid3KsbCA7dmNA2xgaSKzBerhYpPKXKHzvKg"
const imageUrl  = "https://amber-electrical-marten-124.mypinata.cloud/ipfs/Qmdd68nJeyEvXt91RBY7GnpqYrpeDN68yAekEyg6xAD9DM"
const itemUrl = "https://amber-electrical-marten-124.mypinata.cloud/ipfs/QmRhwC2aXWMid3KsbCA7dmNA2xgaSKzBerhYpPKXKHzvKg"

const merkleMaxDepth = 5
const merkleBufferSize = 8
const rpcURL = 'https://api.devnet.solana.com';

const secretKey = myKey;


export const createNFTCollection = async () => {
  try {
    const umi = createUmi(rpcURL)
      .use(mplTokenMetadata())

    const keyPair = umi.eddsa.createKeypairFromSecretKey(secretKey);
    const signer  = createSignerFromKeypair(
      { eddsa: umi.eddsa },
      keyPair
    );
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
 // Get balance (in lamports)
 const balance = await connection.getBalance(new PublicKey(keyPair.publicKey));

 // Convert lamports to SOL (1 SOL = 10^9 lamports)
 const solBalance = balance / LAMPORTS_PER_SOL;

 console.log(`Balance of ${solBalance} SOL`);

    umi.use(signerIdentity(signer));

    // return;
    const collectionImageUri = imageUrl;
    fs.writeFileSync(
      './data/collectionImageUri.txt',
      collectionImageUri
    );

    const collectionObject = {
      name                   : collectionName,
      symbol                 : collectionSymbol,
      description            : collectionDesc,
      seller_fee_basis_points: 0 * 100,
      image                  : collectionImageUri,
      properties             : {
        category: 'image',
        files: [
          {
            file: collectionImageUri,
            type: 'image/png',
          },
        ],
      },
    };

    const collectionJsonUri = collectUrl;
    console.log('collectionJsonUri:', collectionJsonUri);
    fs.writeFileSync(
      './data/collectionJsonUri.txt',
      collectionJsonUri
    );

    const collectionMint = generateSigner(umi);
    console.log("collectionMint:", collectionMint.publicKey);

    //return;

    await createNft(umi, {
      mint                : collectionMint,
      symbol              : collectionSymbol,
      name                : collectionName,
      uri                 : collectionJsonUri,
      sellerFeeBasisPoints: percentAmount(0),
      isCollection        : true,
    }).sendAndConfirm(umi);

    const collectionMintExplolerUrl = `https://explorer.solana.com/address/${
      collectionMint.publicKey
    }?cluster=devnet`

    console.log('collectionMint:', collectionMintExplolerUrl);

    let cluster = "?cluster=devnet";
    const txLink = addrToLink( collectionMint.publicKey, cluster);
    console.log(txLink);

    fs.writeFileSync(
      `./data/collectionMint${
        'Devnet'
      }.txt`,
      collectionMint.publicKey
    );


    createMerkleTree()
  } catch (e) {
    console.error(e);
  }
}
const createMerkleTree = async () => {
  try {

    const umi = createUmi(rpcURL)
      .use(mplTokenMetadata())
      .use(mplBubblegum());

    const keyPair = umi.eddsa.createKeypairFromSecretKey(secretKey);
    const signer  = createSignerFromKeypair({ eddsa: umi.eddsa }, keyPair);
    // console.log("keyPair", keyPair);
    // console.log("signer", signer);

    umi.use(signerIdentity(signer));

    const merkleTree = generateSigner(umi);
    console.log("merkleTree:", merkleTree.publicKey);
    //return;

    const builder = await createTree(umi, {
      merkleTree,
      maxDepth     : merkleMaxDepth,
      maxBufferSize: merkleBufferSize,
    });
    await builder.sendAndConfirm(umi);

    let cluster = "?cluster=devnet";
    const txLink = addrToLink( merkleTree.publicKey, cluster);
    console.log(txLink);

    fs.writeFileSync(
      `./data/merkleTreeDevnet.txt`,
      merkleTree.publicKey
    );
    
    mintCNFT()
  } catch (e) {
    console.error(e);
  }
}
const mintCNFT = async () => {
  try {
    const umi = createUmi(rpcURL)
      .use(mplTokenMetadata())
      .use(mplBubblegum());

    const keyPair = umi.eddsa.createKeypairFromSecretKey(secretKey);
    const signer  = createSignerFromKeypair({ eddsa: umi.eddsa }, keyPair);
    // console.log("keyPair", keyPair);
    console.log("signer:", signer.publicKey);

    umi.use(signerIdentity(signer));
    let nodeEnv = "Devnet";

    const merkleTreeTxt     = fs.readFileSync("./data/merkleTree"+nodeEnv+".txt", 'utf8');
    const merkleTreeAccount = await fetchMerkleTree(umi, publicKey(merkleTreeTxt));
    console.log("merkleTreeAccount:", merkleTreeAccount.publicKey);

    const collectionMintTxt     = fs.readFileSync("./data/collectionMint"+nodeEnv+".txt", 'utf8');
    const collectionMintAccount = publicKey(collectionMintTxt);
    console.log("collectionMintAccount:", collectionMintAccount);

    const nftItemJsonUri = itemUrl;
    console.log('nftItemJsonUri:', nftItemJsonUri)
    fs.writeFileSync(
      './data/nftItemJsonUri.txt',
      nftItemJsonUri
    );

    const data = await readCsv('./addressList.csv');

    for( let i = 0; i < data.length; i++) {
      console.log("-", data[i].address);

      const mintItemTo = publicKey(data[i].address);
      console.log(mintItemTo);

      const mint = await mintToCollectionV1(umi, {
        leafOwner     : mintItemTo,
        merkleTree    : merkleTreeAccount.publicKey,
        collectionMint: collectionMintAccount,
        metadata      : {
          name                : 'CAPTAIN BALLZ',
          uri                 : nftItemJsonUri,
          sellerFeeBasisPoints: 0 * 100,
          collection          : {
            key:      collectionMintAccount,
            verified: false
          },
          creators            : [
            {
              address: publicKey('BrPyQ5tCbRLMe2bZySgRnzjGRnQ9SRPFjPX58v9AajeU'),
              verified: false,
              share: 100,
            },
          ],
        },
      }).sendAndConfirm(umi);

      const nftItemMintExplolerUrl = `https://explorer.solana.com/tx/${bs58.encode(
        mint.signature
      )}${'?cluster=devnet'}`;

      fs.writeFileSync(
        `./data/nftItemMint${
          'Devnet'
        }.txt`,
        bs58.encode(mint.signature)
      );

      console.log("Pause: 2s.");
      await new Promise(_ => setTimeout(_,2000));
      console.log("");

    }

  } catch (e) {
    console.error(e)
  }
}