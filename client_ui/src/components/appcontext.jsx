"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import API from "./api";

const AppContext = createContext();

export function AppContextProvider({ children }) {
  const [availablePrograms, setAvailablePrograms] = useState([]);
  const [availableKeys, setAvailableKeys] = useState([]);

  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedSignerKey, setSelectedSignerKey] = useState("");


  const loadLists = useCallback(async () => {
    const [progRes, keyRes] = await Promise.all([
      API.get("/api/programs"),
      API.get("/api/keystores")
    ]);
    setAvailablePrograms(progRes.data ?? []);
    setAvailableKeys(keyRes.data ?? []);
  });


  const value = {
    availablePrograms, setAvailablePrograms,
    availableKeys, setAvailableKeys,
    selectedProgram, setSelectedProgram,
    selectedSignerKey, setSelectedSignerKey,
    loadLists
    // add API calls or helpers here too
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}
