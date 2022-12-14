import './App.css';
import { Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react';
import { useEffect, useState } from 'react'
import 'sf-font';
import axios from 'axios';
import VAULTABI from './VAULTABI.json';
import { NFTCONTRACT, STAKINGCONTRACT, moralisapi, nftpng } from './config';
import Web3Modal from "web3modal";
// import WalletConnectProvider from "@walletconnect/web3-provider";
// import WalletLink from "walletlink";
import Web3 from "web3";

var web3 = null;
var account = null;
var vaultcontract = null;
var provider = null;
const gasOptions = { gasPrice: 150000000000, gasLimit: 500000 };

const moralisapikey = "rmo6dN3ukVlyFvERnzAQkjxYW3DQUO4dZIkLgQKvPKdCZ8ZQ3gAzdcnhbT3L5WGI";
const providerOptions = {
    // binancechainwallet: {
    //     package: true
    // },
    // walletconnect: {
    //     package: WalletConnectProvider,
    //     options: {
    //         infuraId: "e3596064a2434b66b3497af106f27886",
    //     },
    // },
    // walletlink: {
    //     package: WalletLink,
    //     options: {
    //         appName: "OSIS Staking dAPP",
    //         infuraId: "e3596064a2434b66b3497af106f27886",
    //         rpc: "https://polygon-mainnet.public.blastapi.io",
    //         chainId: 137,
    //         appLogoUrl: null,
    //         darkMode: true
    //     }
    // },
};

const web3Modal = new Web3Modal({
    network: "mainnet",
    theme: "dark",
    cacheProvider: false,
    providerOptions
});

export default function NFT() {
    const [apicall, getNfts] = useState([])
    const [nftstk, getStk] = useState([])
    const [loadingState, setLoadingState] = useState('not-loaded')
    const [stakeLoading, setStakeLoading] = useState({});
    const [unstakeLoading, setUnstakeLoading] = useState({});

    useEffect(() => {
        callApi()
    }, []);

    const switchNetwork = async (chainId) => {
        if (![137, '0x89', '137'].includes(chainId)) {
            try {
                await provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x89' }],
                });
                await callApi();
                return { msg: 'Change Network Successfull' };
            } catch (e) {
               console.log('error switchNetwork', e);
            }
        }
    }

    async function getNextNftPage(cursor) {
        let config = { 'X-API-Key': moralisapikey, 'accept': 'application/json' };
        return await axios.get((moralisapi + `/nft/${NFTCONTRACT}/owners?chain=polygon&format=decimal&limit=100&cursor=${cursor}`), { headers: config });
    }

    async function callApi() {
        provider = await web3Modal.connect();
        provider.on('chainChanged', switchNetwork);
        web3 = new Web3(provider);
        await provider.request({ method: 'eth_requestAccounts' });
        var accounts = await web3.eth.requestAccounts();
        account = accounts[0];
        switchNetwork(provider.chainId);
        vaultcontract = new web3.eth.Contract(VAULTABI, STAKINGCONTRACT)
        let config = { 'X-API-Key': moralisapikey, 'accept': 'application/json' };
        const nftsRes = await axios.get((moralisapi + `/nft/${NFTCONTRACT}/owners?chain=polygon&format=decimal&limit=100`), { headers: config });
       // .then(output => {
        //     console.log('output data: ', output.data);
        //     const { result } = output.data
        //     return result;
        // })


        const nfts = nftsRes.data.result;
        console.log("nfts res: ", nfts);

        let cursor = nftsRes.data.cursor;
        const numLoop = Math.floor(nftsRes.data.total / nftsRes.data.page_size);
        console.log("num loop: ", numLoop);
        for (let x = 0; x < numLoop - 1; x++) {
            await new Promise(r => { 
                const t = setTimeout(r, 500); 
                // clearTimeout(t);
            });
            const nextPageRes = await getNextNftPage(cursor);
            console.log(`Page[${x}]: `, nextPageRes.data.result);
            cursor = nextPageRes.data.cursor;
            // nfts.concat(nextPageRes.data.result);
            nextPageRes.data.result.forEach((e) => {
                nfts.push(e);
            });
        }

        console.log("all 10000, nft: ", nfts.length);



        const apicall = await Promise.all(nfts.map(async i => {
            let item = {
                tokenId: i.token_id,
                holder: i.owner_of,
                wallet: account,
            }
            return item
        }))
        const stakednfts = await vaultcontract.methods.tokensOfOwner(account).call()
            .then(id => {
                return id;
            })
        const nftstk = await Promise.all(stakednfts.map(async i => {
            let stkid = {
                tokenId: i,
            }
            return stkid
        }))
        getNfts(apicall)
        getStk(nftstk)
        console.log(apicall);
        console.log(nftstk) 
        setLoadingState('loaded')
    }
    console.log('check', { loadingState, apicall, nftstk });
    if (loadingState === 'loaded' && !apicall.length) {
        return (<h1 className="text-3xl">Wallet Not Connected</h1>)
    }

    console.log({ stakeLoading, unstakeLoading })

    return (
        <div className='container mb-4 bg-black'>
            <div className="container nftportal bg-black">
                <div className="row items px-5 pt-1">



                <div class="mb-3 mt-3 bg-black">
                        <div class="progressbartest row">
                            <h3 class="center progress-title">Loading... Do Not Refresh NFT Portal</h3>
                            <div class="progress red">
                                <div class="progress-bar progress-bar-danger progress-bar-striped active" style={{ width: "" }}>
                                    <div class="count"></div>
                                </div>
                            </div>
                        </div>
                    </div>



                    <div className="ml-3 mr-3 bg-black" style={{ display: "inline-grid", gridColumnEnd: "auto", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", columnGap: "10px" }}>
                        {apicall.map((nft, i) => {
                            const owner = nft.wallet.toLowerCase();
                            const holder = nft.holder.toLowerCase();
                            if (owner.indexOf(holder) !== -1) {
                                async function stakeit() {
                                    setStakeLoading({ [i]: true });
                                    await vaultcontract.methods.stake([nft.tokenId]).send({ from: account, ...gasOptions });
                                    setTimeout(async () => {
                                        await callApi();
                                        setStakeLoading({ [i]: false });
                                    }, 22000);
                                }
                                return (
                                    <div className="card nft-card mt-3 mb-3" key={i} >
                                        <div className="image-over">
                                            <img className="card-img-top" src={nftpng + nft.tokenId + '.png'} alt="" />
                                        </div>
                                        <div className="card-caption col-12 p-0">
                                            <div className="card-body">
                                                <h5 className="mb-0">OSIS MetaBadges<br></br> #{nft.tokenId}</h5>
                                                <h5 className="mb-0 mt-2">Status<p style={{ color: "#6db647", fontWeight: "bold", textShadow: "1px 1px 2px #000000" }}>Ready to Stake</p></h5>
                                                <div className="card-bottom d-flex justify-content-between">
                                                    <input key={i} type="hidden" id='stakeid' value={nft.tokenId} />
                                                    <Button style={{ marginLeft: '2px', backgroundColor: "#ffffff10" }} onClick={stakeit}>{stakeLoading[i] ? 'Staking...' : 'Stake it'}</Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            }
                        })}
                        {nftstk.map((nft, i) => {
                            async function unstakeit() {
                                setUnstakeLoading({ [i]: true });
                                vaultcontract.methods.unstake([nft.tokenId]).send({ from: account, ...gasOptions });
                                setTimeout(async () => {
                                    await callApi();
                                    setUnstakeLoading({ [i]: false });
                                }, 22000);
                            }
                            return (
                                <div key={i}>
                                    <div className="card stakedcard mt-3 mb-3" >
                                        <div className="image-over">
                                            <img style={{ position: 'absolute', top: '0.05rem', width: '50px' }} src='metabadges.png'></img>
                                            <img className="card-img-top" src={nftpng + nft.tokenId + '.png'} alt="" />
                                        </div>
                                        <div className="card-caption col-12 p-0">
                                            <div className="card-body">
                                                <h5 className="mb-0">OSIS MetaBadges<br></br> #{nft.tokenId}</h5>
                                                <h5 className="mb-0 mt-2">Status<p style={{ color: "#15F4EE", fontWeight: "bold", textShadow: "1px 1px 2px #000000" }}>Currently Staked</p></h5>
                                                <div className="card-bottom d-flex justify-content-between">
                                                    <input type="hidden" id='stakeid' value={nft.tokenId} />
                                                    <Button style={{ marginLeft: '2px', backgroundColor: "#ffffff10" }} onClick={unstakeit}>{unstakeLoading[i] ? 'Unstaking...' : 'Unstake it'}</Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}