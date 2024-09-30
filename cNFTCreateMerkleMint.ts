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


const collectionName = "Solana Fellowship Session 8"
const collectionSymbol = 'S8'
const collectionDesc = 'cNFT of my Profile picture and social media links'
const collectUrl  = "https://amber-electrical-marten-124.mypinata.cloud/ipfs/QmRhwC2aXWMid3KsbCA7dmNA2xgaSKzBerhYpPKXKHzvKg"
const imageUrl  = "https://amber-electrical-marten-124.mypinata.cloud/ipfs/Qmdd68nJeyEvXt91RBY7GnpqYrpeDN68yAekEyg6xAD9DM"
const itemUrl = "https://amber-electrical-marten-124.mypinata.cloud/ipfs/QmRhwC2aXWMid3KsbCA7dmNA2xgaSKzBerhYpPKXKHzvKg"

const merkleMaxDepth = 14
const merkleBufferSize = 64
const rpcURL =
  (process.env.NODE_ENV === 'production'
    ? process.env.SOLANA_MAINNET_RPC_URL
    : process.env.SOLANA_DEVNET_RPC_URL) || 'https://api.devnet.solana.com';

const secretKey = new Uint8Array([
  60, 191,  34, 200,  83, 127, 230, 200,  46, 156,   9,
 233, 196, 236,  75, 142, 230,  60, 104,  28,  16, 237,
 151, 119,  46,  90,  92,  25, 165,  64, 141, 122, 247,
  25, 145, 141, 242,  71, 130, 230, 229, 122,  92, 148,
  79,  50,  51, 228, 123, 114, 254, 199, 120,  54,  39,
  33, 186,  38,  31, 227, 164, 221, 197, 192
]);


export const createNFTCollection = async () => {
  try {
    const umi = createUmi(rpcURL)
      .use(mplTokenMetadata())

    const keyPair = umi.eddsa.createKeypairFromSecretKey(secretKey);
    const signer  = createSignerFromKeypair(
      { eddsa: umi.eddsa },
      keyPair
    );
    const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
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
    }${process.env.NODE_ENV !== 'production' && '?cluster=devnet'}`

    console.log('collectionMint:', collectionMintExplolerUrl);

    let cluster = ""; if (process.env.NODE_ENV !== 'production') { cluster = '?cluster=devnet';}
    const txLink = addrToLink( collectionMint.publicKey, cluster);
    console.log(txLink);

    fs.writeFileSync(
      `./data/collectionMint${
        process.env.NODE_ENV === 'production' ? 'Mainnet' : 'Devnet'
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

    let cluster = ""; if (process.env.NODE_ENV !== 'production') { cluster = '?cluster=devnet';}
    const txLink = addrToLink( merkleTree.publicKey, cluster);
    console.log(txLink);

    fs.writeFileSync(
      `./data/merkleTree${
        process.env.NODE_ENV === 'production' ? 'Mainnet' : 'Devnet'
      }.txt`,
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
    let nodeEnv = ""; if (process.env.NODE_ENV === 'production') {
      nodeEnv = 'Mainnet';
    } else {
      nodeEnv = 'Devnet';
    }

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
              address: publicKey('HdaKENyK8fxod85QipFYZffC82PmsM8XEW4prcZbeQiK'),
              verified: false,
              share: 100,
            },
          ],
        },
      }).sendAndConfirm(umi);

      const nftItemMintExplolerUrl = `https://explorer.solana.com/tx/${bs58.encode(
        mint.signature
      )}${process.env.NODE_ENV !== 'production' && '?cluster=devnet'}`;

      fs.writeFileSync(
        `./data/nftItemMint${
          process.env.NODE_ENV === 'production' ? 'Mainnet' : 'Devnet'
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