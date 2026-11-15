# Proposal 224: mined retries omitted the access list

The preceding production execution release is withdrawn. Prepared-request and
read-only simulation checks did not establish that the founder's actual wallet
submission would retain the access list. The public execution path for 224-256
is held again. Do not retry or increase gas as a workaround.

Polygon mainnet, governance `0x785cC854ce9e13CE1140cbFD7C08620713E1711d`:

| Transaction | Block | Status | Gas limit | Gas used | Access keys |
| --- | ---: | ---: | ---: | ---: | ---: |
| `0x4b9f88e54015bb0d554dfb2ebfc1fbfc0526c7342e8ce1807992009f4d526d9b` | 97363460 | 0 | 31800000 | 31232414 | 0 |
| `0xf1d1b76c72e68802a2e4877a2e23295c2390d8b23a3930afc6efb640d845b4ed` | 97363485 | 0 | 31800000 | 31232414 | 0 |

Both were type-2 calls to `executeTransaction(224)` from
`0x67E138a2f46AEF2a0031CfCb5Ae843b41c973f41`, nonces 280 and 281.
The P39 repair implementation exhausted gas; the executor and outer multisig
reverted with `Tx failed`. Fees were 10.178866755173551254 and
9.499842973981711436 POL. No repair writes survived these reverted transactions.
At block 97363630, 224 and 225 were still unexecuted with three approvals each.

The exact component that dropped the field must be distinguished from the
confirmed result: it was absent in both signed/mined transactions. A unit check
of ethers serialization is not an end-to-end signing guarantee. A further
intercepted full Contract/BrowserProvider request retained 3,900 keys before the
external wallet boundary. No live transaction was sent during this test.

The approved repair content, destination positions and original payments are
unchanged. No new repair proposal has been submitted by this containment change.
