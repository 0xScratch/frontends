// import dayjs from "dayjs"
import useStorage from "squirrel-gill"
import useSWR from "swr"

import { Divider, Typography } from "@mui/material"

import { fetchTokensMarksUrl } from "@/apis/sessions"
import { BRIDGE_BALANCES, WALLET_MARKS } from "@/constants/storageKey"
import { useRainbowContext } from "@/contexts/RainbowProvider"
import useSessionsStore from "@/stores/sessionsStore"

import Card from "../components/Card"
import BridgeTokenList from "./List"
import { MarksType } from "./List"
import { gasList, tokenList } from "./tokenList"

const defaultMarks = {
  tokensMarks: tokenList.map(item => ({ ...item, marks: null })),
  gasMarks: gasList.map(item => ({
    ...item,
    amount: null,
    marks: null,
  })),
}

const BridgePoints = () => {
  const { walletCurrentAddress } = useRainbowContext()
  const { hasSignedTerms } = useSessionsStore()
  const [bridgeBalances, setBridgeBalances] = useStorage(localStorage, BRIDGE_BALANCES, {})
  const [walletMarks] = useStorage(localStorage, WALLET_MARKS, {})

  const { data: marks, isLoading } = useSWR(
    [fetchTokensMarksUrl(walletCurrentAddress), walletCurrentAddress, hasSignedTerms],
    async ([url, walletAddress, signed]) => {
      try {
        if (!walletAddress || !signed) {
          throw new Error("Wallet address or signed terms missing.")
        }

        // const now = dayjs().unix()
        // const timestamp = bridgeBalances[walletAddress]?.timestamp ?? 0
        // const isDataExpired = dayjs.unix(now).diff(dayjs.unix(timestamp), "day") > 1

        // if (isDataExpired) {
        const list = await scrollRequest(url)
        const tokensMarks = tokenList.map(item => {
          const withMarks = list.filter(item => item.points).find(i => i.bridge_asset.toUpperCase() === item.symbol.toUpperCase())
          let marks = withMarks?.points ?? 0

          if (item.additionalToken) {
            const additionalToken = list.filter(item => item.points).find(i => i.bridge_asset.toUpperCase() === item.additionalToken.toUpperCase())
            if (additionalToken) {
              marks += additionalToken.points ?? 0
            }
          }

          return {
            ...item,
            marks,
          }
        })
        const gasMarksResult = list.find(item => item.bridge_asset === "gas-points")
        const gasMarks = gasList.map(item => ({
          ...item,
          amount: gasMarksResult?.amount ?? 0,
          marks: gasMarksResult?.points ?? 0,
        }))
        setBridgeBalances({
          ...bridgeBalances,
          [walletAddress]: {
            tokensMarks,
            gasMarks,
            timestamp: walletMarks[walletAddress]?.timestamp ?? 0,
          },
        })
        return {
          tokensMarks,
          gasMarks,
        }
        // } else {
        //   const tokensMarks = bridgeBalances[walletAddress]?.tokensMarks ?? []
        //   const gasMarks = bridgeBalances[walletAddress]?.gasMarks ?? []
        //   return {
        //     tokensMarks,
        //     gasMarks,
        //   }
        // }
      } catch (e) {
        return defaultMarks
      }
    },
    {
      fallbackData: defaultMarks,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )

  return (
    <Card
      // marginTop="24px"
      bottomDiff="0.8rem"
    >
      <Typography sx={{ fontSize: ["2rem", "2.4rem"], lineHeight: ["3.2rem"], marginBottom: ["2.4rem"], fontWeight: 600, textAlign: "center" }}>
        Session Zero
      </Typography>

      <BridgeTokenList
        type={MarksType.ELIGIBLE_ASSETS}
        title="Marks for bridged eligible assets"
        description="Marks are rewarded to all eligible bridged assets since Scroll's mainnet launch on October 10th, 2023, based on amount and time held on Scroll."
        data={marks?.tokensMarks}
        isLoading={isLoading}
      ></BridgeTokenList>
      <Divider sx={{ margin: "0 0 2.4rem 0" }}></Divider>

      <BridgeTokenList
        type={MarksType.GAS_SPENT}
        title="Marks for gas spent on Scroll"
        description="Marks have been awarded to users with more than $5 total gas spent on Scroll from the mainnet launch on Oct 10th, 2023 to Apr 29th, 2024 12pm UTC."
        data={marks?.gasMarks}
        isLoading={isLoading}
      ></BridgeTokenList>
    </Card>
  )
}

export default BridgePoints
