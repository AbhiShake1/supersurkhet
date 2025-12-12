import { useContextData } from '@/lib/ui-builder/context/context-data-store'
import { createFileRoute } from '@tanstack/react-router'
import React, { useImperativeHandle, useLayoutEffect } from 'react'

export const Route = createFileRoute('/testroute')({
  component: RouteComponent,
})

function RouteComponent() {
  const ref = React.useRef<any>(null)
  useLayoutEffect(() => {
    console.log("ref", ref.current.provider1())
  }, [])
  return <CompWithRef ref={ref} />
  // const contextData = useContextData()
  // return <>
  //   ----- level 1 ----
  //   <p>contextData: {tryStringify(contextData?.context ?? {}, "lev1")}</p>
  //   <Provider1>
  //     <Child1 />
  //   </Provider1>
  //   ---- level 1 end ----
  // </>
}

const CompWithRef = React.forwardRef((props, ref) => {
  useImperativeHandle(ref, () => ({
    provider1: () => 'value-from-ref',
  }))
  return <div>
    <p>hello</p>
  </div>
})

function Child1() {
  const contextData = useContextData()
  const provider1 = useProvider()

  return <>
    ------ level 2 ------
    <p>contextData: {tryStringify(contextData?.context ?? {}, "lev2")}</p>
    <Provider2>
      <Child2 />
    </Provider2>
    ------ level 2 end ------
    <p>provider1: {provider1.provider1}</p>
  </>
}

function Child2() {
  const contextData = useContextData()
  const provider2 = useProvider2()

  return <>
    ------ level 3 ------
    <p>contextData: {tryStringify(contextData?.context ?? {}, "lev3")}</p>
    <p>provider2: {provider2.provider2}</p>
    ------ level 3 end ------
  </>
}

const mem = new Map()

function tryStringify(value: any, id: string) {
  try {
    const stringified = JSON.stringify(value)
    mem.set(id, { value: stringified, iteration: (mem.get(id)?.iteration ?? 0) + 1 })
    return stringified
  } catch (e) {
    console.error(id, value, e)
    return `error occured at iteration ${mem.get(id)?.iteration ?? 0}. last structure: ${mem.get(id).value}`
  }
}

const context = React.createContext({ provider1: 'value' })
const context2 = React.createContext({ provider2: 'value' })

export function useProvider() {
  return React.useContext(context)
}

function useProvider2() {
  return React.useContext(context2)
}

function Provider1({ children }: React.PropsWithChildren) {
  return <context.Provider value={{ provider1: 'value-from-ctx' }}>
    {children}
  </context.Provider>
}

function Provider2({ children }: React.PropsWithChildren) {
  return <context2.Provider value={{ provider2: 'value-from-ctx' }}>
    {children}
  </context2.Provider>
}
