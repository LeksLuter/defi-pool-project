@@ .. @@
       if (process.env.REACT_APP_POOL_ADDRESS) {
-        setPoolContract(getPoolContract(process.env.REACT_APP_POOL_ADDRESS));
+        const poolAddr = import.meta.env.VITE_POOL_ADDRESS || "0x1234567890123456789012345678901234567890";
+        setPoolContract(getPoolContract(poolAddr));
       }
       
       if (process.env.REACT_APP_VAULT_ADDRESS) {
-        setVaultContract(getVaultContract(process.env.REACT_APP_VAULT_ADDRESS));
+        const vaultAddr = import.meta.env.VITE_VAULT_ADDRESS || "0x1234567890123456789012345678901234567890";
+        setVaultContract(getVaultContract(vaultAddr));
       }
     } catch (err) {