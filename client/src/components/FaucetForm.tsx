import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { ClipLoader } from "react-spinners"
import Select from 'react-select'

import './styles/FaucetForm.css'
import ReCaptcha from './ReCaptcha'
import FooterBox from './FooterBox'
import queryString from 'query-string'
import { DropdownOption } from './types'
import { AxiosResponse } from 'axios'

const FaucetForm = (props: any) => {
    const [chain, setChain] = useState<number | null>(null)
    const [token, setToken] = useState<number | null>(null)
    const [widgetID, setwidgetID] = useState<string | undefined>(undefined)
    const [isV2, setIsV2] = useState<boolean>(false)
    const [chainConfigs, setChainConfigs] = useState<any>([])
    const [inputAddress, setInputAddress] = useState<string>("")
    const [address, setAddress] = useState<string | null>(null)
    const [faucetAddress, setFaucetAddress] = useState<string | null>(null)
    const [options, setOptions] = useState<DropdownOption[]>([])
    const [tokenOptions, setTokenOptions] = useState<DropdownOption[]>([]);
    const [balance, setBalance] = useState<number>(0)
    const [shouldAllowSend, setShouldAllowSend] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [isFetchingBalance, setIsFetchingBalance] = useState<AbortController | null>(null)
    const [sendTokenResponse, setSendTokenResponse] = useState<any>({
        txHash: null,
        message: null
    })

    const recaptcha: ReCaptcha = new ReCaptcha(
        props.config.SITE_KEY,
        props.config.ACTION,
        props.config.V2_SITE_KEY,
        setwidgetID,
        widgetID
    )

    // Update chain configs
    useEffect(() => {
        updateChainConfigs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Update balance whenver chain changes or after transaction is processed
    useEffect(() => {
        updateBalance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chain, sendTokenResponse, chainConfigs])

    // Make REQUEST button disabled if either address is not valid or balance is low
    useEffect(() => {
        if(address) {
            if(balance > chainConfigs[token!]?.DRIP_AMOUNT) {
                setShouldAllowSend(true)
                return
            }
        }
        
        setShouldAllowSend(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [address, balance])

    useEffect(() => {
        updateFaucetAddress()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chain, chainConfigs])

    useEffect(() => {
        let newOptions: DropdownOption[] = []
        
        chainConfigs?.forEach((chain: any, i: number) => {
            let item = <div className='select-dropdown'>
                <img alt = { chain.NAME } src = { chain.IMAGE } />
                { chain.NAME }

                {
                    chain.CONTRACTADDRESS &&
                    <span style={{color: 'rgb(180, 180, 183)', fontSize: "10px", marginLeft: "5px"}}>
                        {
                            chainConfigs[chainToIndex(chain.HOSTID) || 0]?.NAME
                        }
                    </span>
                }
            </div>

            if(!chain.CONTRACTADDRESS) {
                newOptions.push({
                    label: item,
                    value: i,
                    search: chain.NAME
                })
            }
        })
        
        setOptions(newOptions)
        setChain(newOptions[0]?.value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chainConfigs])

    useEffect(() => {
        let newOptions: DropdownOption[] = []
        
        chainConfigs?.forEach((chain: any, i: number) => {
            const { chain: ch } = getChainParams();

            let item = <div className='select-dropdown'>
                <img alt = { chain.NAME } src = { chain.IMAGETOKEN } />
                { chain.ID === ch ? chain.TOKEN : chain.NAME }

                <span style={{color: 'rgb(180, 180, 183)', fontSize: "10px", marginLeft: "5px"}}>
                    {
                        chain.CONTRACTADDRESS ?
                        "ERC20" :
                        "Native"
                    }
                </span>
            </div>

            if((chain.CONTRACTADDRESS && chain.HOSTID === ch) || chain.ID === ch) {
                newOptions.push({
                    label: item,
                    value: i,
                    search: chain.NAME
                })
            }
        })

        setTokenOptions(newOptions)
        setToken(newOptions[0]?.value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chainConfigs, chain])

    const getConfigByTokenAndNetwork = (token: any, network: any): number => {
        let selectedConfig = 0;

        try {
            token = token?.toUpperCase();
            network = network?.toUpperCase();
            
            chainConfigs.forEach((chain: any, i: number): any => {
                if(chain.TOKEN === token && chain.HOSTID === network) {
                    selectedConfig = i;
                }
            })
        } catch(err: any) {
            console.log(err)
        }

        return selectedConfig;
    }

    let totalTokens: boolean = tokenOptions?.length === 0;

    useEffect(() => {
        const query = queryString.parse(window.location.search)
        
        const { address, subnet, erc20 } = query

        const tokenIndex: number = getConfigByTokenAndNetwork(erc20, subnet)
        
        if(typeof address == "string") {
            updateAddress(address)
        }

        if(typeof subnet == "string") {
            setChain(chainToIndex(subnet))
            if(typeof erc20 == "string") {
                setToken(tokenIndex)
            }
        } else {
            setChain(0)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [window.location.search, options, totalTokens])

    // API calls
    async function updateChainConfigs(): Promise<void> {
        const response: AxiosResponse = await props.axios.get(
            props.config.api.getChainConfigs
        )
        setChainConfigs(response?.data?.configs)
    }

    function getChainParams(): {chain: string, erc20: string} {
        let params = {
            chain: chainConfigs[chain!]?.ID,
            erc20: chainConfigs[token!]?.ID
        }

        return params
    }

    async function updateBalance(): Promise<void> {
        // Abort pending requests
        const controller = new AbortController();
        if(isFetchingBalance) {
            isFetchingBalance.abort()
        }
        setIsFetchingBalance(controller)

        if((chain || chain === 0) && chainConfigs.length > 0) {
            let { chain, erc20 } = getChainParams()
            
            const response: AxiosResponse = await props.axios.get(props.config.api.getBalance, {
                params: {
                    chain,
                    erc20
                },
                signal: controller.signal
            })
        
            if(response?.data?.balance || response?.data?.balance === 0) {
                setBalance(response?.data?.balance)
            }
        }
    }

    async function updateFaucetAddress(): Promise<void> {
        if((chain || chain === 0) && chainConfigs.length > 0) {
            let { chain } = getChainParams()
            
            const response: AxiosResponse = await props.axios.get(props.config.api.faucetAddress, {
                params: {
                    chain
                }
            })
            
            if(response?.data) {
                setFaucetAddress(response?.data?.address)
            }
        }
    }

    function chainToIndex(id: any): number | null {
        if(chainConfigs?.length > 0) {
            if(typeof id == "string") {
                id = id.toUpperCase()
            }
            let index: number = 0
            chainConfigs.forEach((chain: any, i: number) => {
                if(id === chain.ID) {
                    index = i
                }
            })
            return index
        } else {
            return null
        }
    }

    function updateAddress(addr: any): void {
        setInputAddress(addr!)
        
        if (addr) {
            if (ethers.utils.isAddress(addr)) {
                setAddress(addr)
            } else {
                setAddress(null)
            }
        } else if (address != null) {
            setAddress(null)
        }
    }

    async function getCaptchaToken(): Promise<{token?:string, v2Token?: string}> {
        const { token, v2Token } = await recaptcha.getToken(isV2)
        return { token, v2Token }
    }

    function updateChain(option: any): void {
        let chainNum: number = option.value
        
        if(chainNum >= 0 &&  chainNum < chainConfigs.length) {
            setChain(chainNum)
            back()
        }
    }

    function updateToken(option: any): void {
        let tokenNum: number = option.value
        
        if(tokenNum >= 0 &&  tokenNum < chainConfigs.length) {
            setToken(tokenNum)
            back()
        }
    }

    async function sendToken(): Promise<void> {
        if(!shouldAllowSend) {
            return
        } 
        let data: any
        try {
            setIsLoading(true)

            const { token, v2Token } = await getCaptchaToken()

            let { chain, erc20 } = getChainParams()

            const response = await props.axios.post(props.config.api.sendToken, {
                address,
                token,
                v2Token,
                chain,
                erc20
            })
            data = response?.data
        } catch(err: any) {
            data = err?.response?.data || err
        }

        if(typeof data?.message == "string") {
            if(data.message.includes("Captcha verification failed")) {
                setIsV2(true)
                !isV2 && recaptcha?.loadV2Captcha(props.config.V2_SITE_KEY);
            }
        } 

        setSendTokenResponse({
            txHash: data?.txHash,
            message: data?.message
        })

        setIsLoading(false)
    }

    const getOptionByValue = (value: any): DropdownOption => {
        let selectedOption: DropdownOption = options[0]
        options.forEach((option: DropdownOption): void => {
            if(option.value === value) {
                selectedOption = option
            }
        })
        return selectedOption
    }

    const getTokenOptionByValue = (value: any): DropdownOption => {
        let selectedOption: DropdownOption = tokenOptions[0]
        tokenOptions.forEach((option: DropdownOption): void => {
            if(option.value === value) {
                selectedOption = option
            }
        })
        return selectedOption
    }

    const customStyles = {
        control: (base: any, state: { isFocused: any }) => ({
            ...base,
            // background: "hsla(0,0%,100%,0.5)",
            borderRadius: state.isFocused ? "5px 5px 0 0" : 5,
            borderStyle: null,
            borderColor: state.isFocused ? "white" : "#333",
            boxShadow: "0px 90.9961px 72.7969px rgba(41, 72, 152, 0.05), 0px 58.9789px 42.6334px rgba(41, 72, 152, 0.037963), 0px 35.0503px 23.1872px rgba(41, 72, 152, 0.0303704), 0px 18.1992px 11.8295px rgba(41, 72, 152, 0.025), 0px 7.4145px 5.9316px rgba(41, 72, 152, 0.0196296), 0px 1.68511px 2.86469px rgba(41, 72, 152, 0.012037)",
            cursor: "pointer",
            // "&:hover": {
            //     borderColor: "white"
            // }
        }),
        menu: (base: any) => ({
            ...base,
            borderRadius: 0,
            marginTop: 0,
            background: "#1b1832",
            color: "grey"
        }),
        menuList: (base: any) => ({
            ...base,
            padding: 0,
            "::-webkit-scrollbar": {
                width: "2px"
            },
            "::-webkit-scrollbar-track": {
                background: "black"
            },
            "::-webkit-scrollbar-thumb": {
                background: "#888"
            },
            "::-webkit-scrollbar-thumb:hover": {
                background: "#555"
            }
        }),
        option: (styles: any, {isFocused, isSelected}: any) => ({
            ...styles,
            // background: isFocused
            //         ?
            //         '#0fd3ee'
            //         :
            //         isSelected
            //         ?
            //         undefined
            //         :
            //         undefined,
            // zIndex: 1
        }),
        input: (base: any) => ({
            ...base,
            // color: "white"
        }),
        singleValue: (base: any) => ({
            ...base,
            // color: "white"
        })
    }

    const ChainDropdown = () => (
        <div style={{width: "100%", marginTop: "5px"}}>
            <Select
                className="react-select-container"
                classNamePrefix="react-select"
                options={options}
                value={getOptionByValue(chain)}
                onChange={updateChain}
                styles={customStyles}
                getOptionValue ={(option: any)=>option.search}
            />
        </div>
    )

    const TokenDropdown = () => (
        <div style={{width: "100%"}}>
            <Select
                className="react-select-container"
                classNamePrefix="react-select"
                options={tokenOptions}
                value={getTokenOptionByValue(token)}
                onChange={updateToken}
                styles={customStyles}
                getOptionValue ={(option: any)=>option.search}
            />
        </div>
    )

    const resetRecaptcha = (): void => {
        setIsV2(false)
        recaptcha.resetV2Captcha()
    }

    const back = (): void => {
        resetRecaptcha()
        setSendTokenResponse({
            txHash: null,
            message: null
        })
    }

    const toString = (mins: number): string => {
        if(mins < 60) {
            return `${mins} minute${mins > 1 ? 's' : ''}`
        } else {
            const hour = ~~(mins / 60)
            const minute = mins % 60

            if(minute === 0) {
                return `${hour} hour${hour > 1 ? 's' : ''}`
            } else {
                return `${hour} hour${hour > 1 ? 's' : ''} and ${minute} minute${minute > 1 ? 's' : ''}`
            }
        }
    }

    return (
        <div className='container'>
            <div className = "box">
                <div className='banner' />

                <div className='box-content'>
                    <div className='box-header'>
                        <span>
                            <span className="font">Select Network</span>
                        </span>

                        <ChainDropdown /> <br/>

                        <div>
                            <div style={{width: "100%"}}>
                                <span className="font" style={{fontSize: "12px", float: "right"}}>
                                    Faucet balance: {Math.round(balance/1e9 * 100) / 100} {chainConfigs[token!]?.TOKEN}
                                </span>

                                <span className="font" style={{fontSize: "12px"}}>
                                    Select Token
                                </span>
                                <TokenDropdown/>
                            </div>
                        </div>
                    </div>

                    <br/>

                    <div style={{ display: sendTokenResponse?.txHash ? "none" : "block" }}>
                        <p className='rate-limit-text font'>
                            Drops are limited to 
                            <span>
                                {chainConfigs[token!]?.RATELIMIT?.MAX_LIMIT} request in {toString(chainConfigs[token!]?.RATELIMIT?.WINDOW_SIZE)}.
                            </span>
                        </p>

                        <div className='address-input'>
                            <input placeholder='Destination zkSYS Wallet Address' value={inputAddress || ""} onChange={(e) => updateAddress(e.target.value)} autoFocus/>
                        </div>
                        <span className='rate-limit-text' style={{color: "red"}}>{sendTokenResponse?.message}</span>

                        <div className='v2-recaptcha' style={{marginTop: "10px"}}></div>
                        
                        <div className="beta-alert">
                            <p>This is a devnet faucet. Funds are not real.</p>
                        </div>
                    
                        <button style={{transition: "all 0.2s",textShadow: "0 0 1px rgba(255,255,255,0.5)",boxShadow: "0 0 5px rgba(255,255,255,0.3)",padding: "8px 16px",borderRadius: "4px",display: "inline-block"}}
                            onMouseOver={(e) => {e.currentTarget.style.textShadow = "0 0 2px rgba(255,255,255,0.8)";e.currentTarget.style.boxShadow = "0 0 6px rgba(255,255,255,0.5)";e.currentTarget.style.transform = "scale(1.02)";}}
                            onMouseOut={(e) => {e.currentTarget.style.textShadow = "0 0 1px rgba(255,255,255,0.5)";e.currentTarget.style.boxShadow = "0 0 5px rgba(255,255,255,0.3)";e.currentTarget.style.transform = "scale(1)";}}
                            className={shouldAllowSend ? 'send-button' : 'send-button-disabled'} onClick={sendToken}>
                            {
                                isLoading
                                ?
                                <ClipLoader size="20px" speedMultiplier={0.3} color="403F40"/>
                                :
                                <span className="font">Request {chainConfigs[token || 0]?.DRIP_AMOUNT / 1e9} {chainConfigs[token || 0]?.TOKEN}</span>
                            }
                        </button>
                    </div>
                    
                    <div style={{ display: sendTokenResponse?.txHash ? "block" : "none" }}>
                        <p className='rate-limit-text font'>
                            {sendTokenResponse?.message}
                        </p>

                        <div>
                            <span className='bold-text font'>Transaction ID</span>
                            <p className='rate-limit-text'>
                                <a
                                    target = {'_blank'}
                                    href = {chainConfigs[token!]?.EXPLORER + '/tx/' + sendTokenResponse?.txHash}
                                    rel = "noreferrer"
                                >
                                    {sendTokenResponse?.txHash}
                                </a>
                            </p>
                        </div>

                        <button className='back-button' onClick={back}>Back</button>
                    </div>
                </div>
            </div>

            <FooterBox
                chain = {chain}
                token = {token}
                chainConfigs = {chainConfigs}
                chainToIndex = {chainToIndex}
                faucetAddress = {faucetAddress}
            />
        </div>


    )
}

export default FaucetForm
